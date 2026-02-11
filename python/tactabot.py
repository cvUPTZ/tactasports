import os
import logging
import sqlite3
import asyncio
from datetime import datetime, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler, MessageHandler, filters, CallbackQueryHandler
from contextlib import contextmanager

# --- CONFIGURATION & SETUP ---
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Constants
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ADMIN_IDS = [x.strip() for x in os.getenv("ADMIN_IDS", "").split(",") if x.strip()]
ANNOUNCEMENT_CHAT_ID = os.getenv("ANNOUNCEMENT_CHAT_ID")

# DYNAMIC PATHS (Fixes 'File Not Found' errors)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'tactabot.db')
UPLOADS_DIR = os.path.join(BASE_DIR, '..', 'public', 'uploads')
CLIPS_DIR = os.path.join(BASE_DIR, '..', 'public', 'clips')

# Ensure directories exist
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(CLIPS_DIR, exist_ok=True)

# Import Clip Generator (Graceful Fallback)
try:
    from clip_generator import generate_clips_from_video
except ImportError:
    logger.warning("⚠️ clip_generator.py NOT FOUND. Video processing will not work.")
    def generate_clips_from_video(p, o, n=-1): return []

# --- DATABASE INITIALIZATION ---
@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        c = conn.cursor()
        
        # Users
        c.execute('''CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            nickname TEXT,
            club TEXT,
            xp INTEGER DEFAULT 0,
            monthly_xp INTEGER DEFAULT 0,
            trust_score INTEGER DEFAULT 50,
            noise_score INTEGER DEFAULT 0,
            is_elite BOOLEAN DEFAULT 0,
            streak_days INTEGER DEFAULT 0,
            tags_today INTEGER DEFAULT 0,
            last_tag_date TEXT,
            joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Migration: Add club and monthly_xp if not exists
        try:
            c.execute("ALTER TABLE users ADD COLUMN club TEXT")
        except sqlite3.OperationalError: pass
        try:
            c.execute("ALTER TABLE users ADD COLUMN monthly_xp INTEGER DEFAULT 0")
        except sqlite3.OperationalError: pass

        # Matches
        c.execute('''CREATE TABLE IF NOT EXISTS matches (
            match_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            status TEXT DEFAULT 'live'
        )''')

        # Clips (Added missing columns from your original code + filename fix)
        c.execute('''CREATE TABLE IF NOT EXISTS clips (
            clip_id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id INTEGER,
            filename TEXT, 
            qc_stage TEXT DEFAULT 'crowd_voting',
            required_tags INTEGER DEFAULT 3,
            consensus_event TEXT,
            status TEXT DEFAULT 'pending', 
            quality_tag TEXT,
            final_event_type TEXT,
            is_announced BOOLEAN DEFAULT 0,
            is_priority BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(match_id) REFERENCES matches(match_id)
        )''')

        # Migration: Add is_announced and is_priority if not exists
        try:
            c.execute("ALTER TABLE clips ADD COLUMN is_announced BOOLEAN DEFAULT 0")
        except sqlite3.OperationalError: pass
        try:
            c.execute("ALTER TABLE clips ADD COLUMN pre_tag TEXT")
        except sqlite3.OperationalError: pass

        # Tags
        c.execute('''CREATE TABLE IF NOT EXISTS tags (
            tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            clip_id INTEGER,
            event_type TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            vote_weight REAL DEFAULT 1.0,
            FOREIGN KEY(user_id) REFERENCES users(user_id),
            FOREIGN KEY(clip_id) REFERENCES clips(clip_id)
        )''')

        # Assignments
        c.execute('''CREATE TABLE IF NOT EXISTS clip_assignments (
            assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            clip_id INTEGER,
            user_id INTEGER,
            completed BOOLEAN DEFAULT 0,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Badges
        c.execute('''CREATE TABLE IF NOT EXISTS badges (
            badge_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            badge_type TEXT,
            awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        conn.commit()
    logger.info("Database initialized successfully.")

# --- HELPER FUNCTIONS ---

def is_admin(user_id: int) -> bool:
    return str(user_id) in ADMIN_IDS

# Stage 1: Rule Validation
def validate_tag_rules(user_id: int, clip_id: int, event_type: str) -> tuple[bool, str]:
    with get_db() as conn:
        c = conn.cursor()
        
        # Spam Check
        c.execute("SELECT timestamp FROM tags WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1", (user_id,))
        last_tag = c.fetchone()

    if last_tag:
        last_time = datetime.strptime(last_tag[0], '%Y-%m-%d %H:%M:%S')
        if (datetime.now() - last_time).total_seconds() < 2:
            return False, "Spam detected: Too fast!"

    # Extended event types for tactical annotation
    valid_events = [
        'Goal', 'KeyPass', 'Pass', 'Defense', 'Press', 'Foul', 'Card', 'Offside', 'None',
        # New tactical events
        'HighPress', 'DefensiveRetreat', 'PositioningError', 'TacticalFoul',
        # Decision quality
        'DecisionCorrect', 'DecisionLate', 'DecisionWrong',
        # Subtypes (Dynamic)
        'Goal_Foot', 'Goal_Head', 'Goal_Penalty', 'Goal_LongShot',
        'Shot_OnTarget', 'Shot_OffTarget', 'Shot_Blocked',
        'Foul_Yellow', 'Foul_Red', 'Foul_None',
        'Pass_Key', 'Pass_Assist', 'Pass_PreAssist',
        'Dribble_1v1', 'Dribble_Progression', 'Dribble_Speed',
        'Duel_Ground', 'Duel_Aerial', 'Duel_50/50',
        'Press_Success', 'Press_ForcedError', 'Press_Passive'
    ]
    if event_type not in valid_events:
        return False, "Invalid event type"
        
    return True, "Valid"

# Stage 2: Crowd Validation (Wisdom of the Crowd)
# Uses 70% agreement threshold among 50-100 fans
CONSENSUS_THRESHOLD = 0.70  # 70% agreement required
MIN_VOTES_FOR_CONSENSUS = 10  # Minimum votes before checking consensus
MAX_VOTES_BEFORE_EXPERT = 50  # Send to experts if no consensus after this many votes

def calculate_crowd_consensus(clip_id: int):
    """
    Calculate consensus using percentage-based agreement.
    - 70%+ agreement → confirmed
    - High variance after 50 votes → ambiguous, send to experts
    """
    with get_db() as conn:
        conn.execute("BEGIN IMMEDIATE")
        c = conn.cursor()
        
        # Get tags with user trust scores (weighted voting)
        c.execute('''
            SELECT t.event_type, u.trust_score 
            FROM tags t 
            JOIN users u ON t.user_id = u.user_id 
            WHERE t.clip_id = ?
        ''', (clip_id,))
        tags = c.fetchall()
        conn.commit()
    
    if not tags:
        return None, "pending"

    # Weighted vote counting (trust score as weight)
    vote_weights = {}
    total_weight = 0
    total_votes = len(tags)
    
    for event, trust in tags:
        trust = trust if trust else 50
        if trust > 20:  # Filter spammers
            weight = trust / 100  # Normalize to 0-1
            vote_weights[event] = vote_weights.get(event, 0) + weight
            total_weight += weight
    
    if total_weight == 0:
        return None, "pending"
    
    # Check for consensus at 70% threshold
    for event, weight in vote_weights.items():
        percentage = weight / total_weight
        if percentage >= CONSENSUS_THRESHOLD and total_votes >= MIN_VOTES_FOR_CONSENSUS:
            if event == 'None':
                return event, "rejected"
            return event, "confirmed"
    
    # Too much variance after enough votes → send to experts
    if total_votes >= MAX_VOTES_BEFORE_EXPERT:
        # Find the top event even if below threshold
        top_event = max(vote_weights.items(), key=lambda x: x[1], default=(None, 0))
        return top_event[0], "ambiguous"  # Marked for expert review
    
    # Still collecting votes
    return None, "crowd_voting"

# Stage 3: Reputation System
def update_trust_score(user_id: int, was_correct: bool, is_spam: bool = False):
    with get_db() as conn:
        c = conn.cursor()
        
        if is_spam:
            c.execute("UPDATE users SET noise_score = noise_score + 10, trust_score = max(0, trust_score - 5) WHERE user_id = ?", (user_id,))
        elif was_correct:
            c.execute("UPDATE users SET trust_score = min(100, trust_score + 1) WHERE user_id = ?", (user_id,))
        else:
            c.execute("UPDATE users SET trust_score = max(0, trust_score - 2) WHERE user_id = ?", (user_id,))
            
        conn.commit()

# Stage 5: Timeline Consistency
def check_timeline_consistency(match_id: int, event_type: str) -> bool:
    with get_db() as conn:
        c = conn.cursor()
        
        c.execute('''
            SELECT final_event_type, created_at 
            FROM clips 
            WHERE match_id = ? AND status = 'confirmed' 
            ORDER BY created_at DESC LIMIT 1
        ''', (match_id,))
        last_event = c.fetchone()
    
    if last_event:
        last_type, _ = last_event
        # Logic: Prevent duplicate goals immediately (Simplified)
        if last_type == 'Goal' and event_type == 'Goal':
            return False 
            
    return True

# Assignment Logic (Fixed SQL Bug)
def ensure_user_exists(user_id: int, username: str = None):
    """Create user if doesn't exist"""
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT user_id FROM users WHERE user_id = ?", (user_id,))
        if not c.fetchone():
            c.execute('''
                INSERT INTO users (user_id, username, trust_score, xp, monthly_xp)
                VALUES (?, ?, 50, 0, 0)
            ''', (user_id, username))
            conn.commit()

def assign_clip_to_user(user_id: int):
    ensure_user_exists(user_id)
    with get_db() as conn:
        c = conn.cursor()
        
        c.execute("SELECT is_elite, trust_score FROM users WHERE user_id = ?", (user_id,))
        user_data = c.fetchone()
        is_elite = user_data[0] if user_data else 0
        trust_score = user_data[1] if user_data else 50
        
        clip = None

        # 1. Elite Review Queue
        if is_elite or trust_score > 80:
            c.execute('''
                SELECT clip_id, filename FROM clips 
                WHERE qc_stage = 'elite_review' 
                AND clip_id NOT IN (SELECT clip_id FROM clip_assignments WHERE user_id = ?)
                LIMIT 1
            ''', (user_id,))
            clip = c.fetchone()

        # 2. Regular Queue
        if not clip:
            # Fixed the SQL Binding Error here (Removed extra user_id)
            c.execute('''
                SELECT c.clip_id, c.filename 
                FROM clips c
                WHERE c.qc_stage = 'crowd_voting'
                AND (SELECT COUNT(*) FROM tags WHERE clip_id = c.clip_id) < c.required_tags
                AND c.clip_id NOT IN (SELECT clip_id FROM clip_assignments WHERE user_id = ?)
                ORDER BY RANDOM()
                LIMIT 1
            ''', (user_id,)) 
            clip = c.fetchone()
        
        if clip:
            c.execute("INSERT INTO clip_assignments (clip_id, user_id) VALUES (?, ?)", (clip[0], user_id))
            conn.commit()
        
        return clip

# Badge System
BADGE_THRESHOLDS = {'Bronze': 100, 'Silver': 500, 'Gold': 2000}

def check_and_award_badges(user_id: int, new_xp: int):
    with get_db() as conn:
        c = conn.cursor()
        
        c.execute("SELECT badge_type FROM badges WHERE user_id = ?", (user_id,))
        existing_badges = {row[0] for row in c.fetchall()}
        
        awarded_badges = []
        for badge_type, threshold in BADGE_THRESHOLDS.items():
            if new_xp >= threshold and badge_type not in existing_badges:
                c.execute("INSERT INTO badges (user_id, badge_type) VALUES (?, ?)", (user_id, badge_type))
                awarded_badges.append(badge_type)
        
        conn.commit()
    return awarded_badges

# Streak System
def update_streak(user_id: int):
    with get_db() as conn:
        c = conn.cursor()
        
        today = datetime.now().date().isoformat()
        yesterday = (datetime.now() - timedelta(days=1)).date().isoformat()
        
        c.execute("SELECT last_tag_date, streak_days, tags_today FROM users WHERE user_id = ?", (user_id,))
        result = c.fetchone()
        
        streak_days = 0
        tags_today = 0
        bonus_xp = 0

        if result:
            last_date, streak_days, tags_today = result
            
            if last_date == today:
                tags_today += 1
            elif last_date == yesterday:
                streak_days += 1
                tags_today = 1
            else:
                streak_days = 1
                tags_today = 1
            
            c.execute('''
                UPDATE users SET last_tag_date = ?, streak_days = ?, tags_today = ? WHERE user_id = ?
            ''', (today, streak_days, tags_today, user_id))
            
            if tags_today == 10:
                bonus_points = 20
                c.execute("UPDATE users SET xp = xp + ?, monthly_xp = monthly_xp + ? WHERE user_id = ?", (bonus_points, bonus_points, user_id))
            
            if streak_days == 7:
                streak_bonus = 50
                c.execute("UPDATE users SET xp = xp + ?, monthly_xp = monthly_xp + ? WHERE user_id = ?", (streak_bonus, streak_bonus, user_id))
                bonus_xp += streak_bonus
                
        conn.commit()
    return streak_days, tags_today, bonus_xp

# --- TELEGRAM HANDLERS ---

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    context.user_data.clear() # Reset state

    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT nickname FROM users WHERE user_id=?", (user.id,))
        result = c.fetchone()

    if result and result[0]:
        # Check for deep link parameters
        if context.args and context.args[0].startswith('tag_'):
            clip_id = int(context.args[0].split('_')[1])
            context.user_data['current_clip_id'] = clip_id
            await start_tagging_specific_clip(update, context, clip_id)
            return

        await update.message.reply_text(f"أهلاً بك مجدداً، {result[0]}! 👋")
        await show_main_menu(update, context)
    else:
        # Check for deep link parameters even for new users (registration first)
        if context.args and context.args[0].startswith('tag_'):
            context.user_data['pending_tag_clip_id'] = int(context.args[0].split('_')[1])
            
        kb = [[InlineKeyboardButton("نعم، نجرب!", callback_data='join_confirm')]]
        await update.message.reply_text(
            "أهلاً بك في **TactaBot**! 👋\nحاب تشارك في تحليل الماتشات؟", 
            reply_markup=InlineKeyboardMarkup(kb), 
            parse_mode='Markdown'
        )

async def get_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Command to get the current chat ID."""
    chat_id = update.effective_chat.id
    logger.info(f"🆔 /get_id called in chat: {chat_id}")
    await update.message.reply_text(f"Current Chat ID: `{chat_id}`", parse_mode='Markdown')

async def message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    text = update.message.text
    
    # 1. Nickname Registration
    if context.user_data.get('awaiting_nickname'):
        nickname = text.strip()
        with get_db() as conn:
            c = conn.cursor()
            c.execute("INSERT OR REPLACE INTO users (user_id, username, nickname) VALUES (?, ?, ?)", 
                      (user.id, user.username, nickname))
            conn.commit()
        context.user_data['awaiting_nickname'] = False
        await update.message.reply_text(f"تمام يا **{nickname}**! 🛡️")
        
        # Resume pending tag if any
        if context.user_data.get('pending_tag_clip_id'):
            clip_id = context.user_data.pop('pending_tag_clip_id')
            context.user_data['current_clip_id'] = clip_id
            await start_tagging_specific_clip(update, context, clip_id)
            return

        await show_main_menu(update, context)
        return

    # 2. Main Menu
    if text == "⚽ ابدأ التاغينغ":
        await send_clip(update, context)
    elif text == "🏆 الترتيب الأسبوعي":
        await show_leaderboard(update, context)
    elif text == "📊 إحصائياتي":
        await show_stats(update, context)
    elif text == "📹 إدارة الفيديوهات":
        if is_admin(user.id): await show_admin_menu(update, context)

# --- BUTTON SETS ---

SPECIFIC_EVENT_BUTTONS = {
    'Goal': [
        [InlineKeyboardButton("🦶 بالرجل", callback_data='tag_Goal_Foot'), 
         InlineKeyboardButton("👤 بالرأس", callback_data='tag_Goal_Head')],
        [InlineKeyboardButton("🎯 ضربة جزاء", callback_data='tag_Goal_Penalty'), 
         InlineKeyboardButton("🚀 تسديدة بعيدة", callback_data='tag_Goal_LongShot')]
    ],
    'Shot': [
        [InlineKeyboardButton("✅ مؤطرة", callback_data='tag_Shot_OnTarget'), 
         InlineKeyboardButton("❌ خارج المرمى", callback_data='tag_Shot_OffTarget')],
        [InlineKeyboardButton("🛡️ محجوبة", callback_data='tag_Shot_Blocked')]
    ],
    'Foul': [
        [InlineKeyboardButton("🟨 بطاقة صفراء", callback_data='tag_Foul_Yellow'), 
         InlineKeyboardButton("🟥 بطاقة حمراء", callback_data='tag_Foul_Red')],
        [InlineKeyboardButton("🚫 بدون بطاقة", callback_data='tag_Foul_None')]
    ],
    'Offside': [
        [InlineKeyboardButton("🚩 تسلل", callback_data='tag_Offside_Yes'), 
         InlineKeyboardButton("🚫 لا يوجد تسلل", callback_data='tag_Offside_No')]
    ],
    'Pass': [
        [InlineKeyboardButton("🎯 تمريرة مفتاحية", callback_data='tag_KeyPass'), 
         InlineKeyboardButton("🚀 كاسرة للخطوط", callback_data='tag_LineBreaker')],
        [InlineKeyboardButton("⚽ تمريرة عادية", callback_data='tag_Pass_Normal')]
    ]
}

DEFAULT_TACTICAL_BUTTONS = [
    [InlineKeyboardButton("🎯 تمريرة مفتاحية", callback_data='tag_KeyPass'), 
     InlineKeyboardButton("🔥 ضغط عالي", callback_data='tag_HighPress')],
    [InlineKeyboardButton("🛡️ تراجع دفاعي", callback_data='tag_DefensiveRetreat'), 
     InlineKeyboardButton("⚠️ ضياع تمركز", callback_data='tag_PositioningError')],
    [InlineKeyboardButton("⚽ هدف", callback_data='tag_Goal'), 
     InlineKeyboardButton("🚫 خطأ تكتيكي", callback_data='tag_TacticalFoul')],
    [InlineKeyboardButton("❌ لا شيء واضح", callback_data='tag_None')]
]

def get_keyboard_for_tag(pre_tag):
    if not pre_tag:
        return DEFAULT_TACTICAL_BUTTONS
    
    keyboard = SPECIFIC_EVENT_BUTTONS.get(pre_tag)
    if keyboard:
        return keyboard
        
    for key in SPECIFIC_EVENT_BUTTONS:
        if key.lower() in pre_tag.lower():
            return SPECIFIC_EVENT_BUTTONS[key]
            
    return DEFAULT_TACTICAL_BUTTONS

async def start_tagging_specific_clip(update: Update, context: ContextTypes.DEFAULT_TYPE, clip_id: int):
    """Start tagging for a specific clip, usually from a broadcast link."""
    user_id = update.effective_user.id
    ensure_user_exists(user_id)
    
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT filename, pre_tag FROM clips WHERE clip_id = ?", (clip_id,))
        clip_data = c.fetchone()
        
        if not clip_data:
            await update.message.reply_text("❌ اللقطة غير موجودة")
            return
            
        filename, pre_tag = clip_data
        # Record assignment if not exists
        c.execute("INSERT OR IGNORE INTO clip_assignments (clip_id, user_id) VALUES (?, ?)", (clip_id, user_id))
        conn.commit()

    video_path = os.path.join(CLIPS_DIR, filename)
    
    keyboard = get_keyboard_for_tag(pre_tag)
    
    caption = f"🎬 لقطة من مباراة {filename[:20]}...\n\n"
    if pre_tag:
        caption += f"🔎 المحلل شافها **{pre_tag}**.\n**حدّد التفاصيل:**"
    else:
        caption += "**وش شفت؟**"
    
    if os.path.exists(video_path):
        try:
            with open(video_path, 'rb') as v:
                # If we have a callback query, we can't reply_video directly to the channel message easily
                # but we can send a NEW message to the user/group
                await update.effective_message.reply_video(
                    video=v, 
                    caption=caption, 
                    reply_markup=InlineKeyboardMarkup(keyboard), 
                    parse_mode='Markdown'
                )
        except Exception as e:
            logger.error(f"Error sending specific video: {e}")
            await update.effective_message.reply_text("خطأ في إرسال الفيديو.")
    else:
        await update.effective_message.reply_text(f"❌ الفيديو غير موجود.")

async def show_main_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    kb = [["⚽ ابدأ التاغينغ", "🏆 الترتيب الأسبوعي"], ["📊 إحصائياتي"]]
    if is_admin(update.effective_user.id):
        kb.append(["📹 إدارة الفيديوهات"])
    await update.message.reply_text("القائمة الرئيسية:", reply_markup=ReplyKeyboardMarkup(kb, resize_keyboard=True))

async def send_clip(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    clip = assign_clip_to_user(user_id)
    
    msg = update.callback_query.message if update.callback_query else update.message

    if not clip:
        await msg.reply_text("🎉 مبروك! كملت كل اللقطات المتوفرة.")
        return

    clip_id, filename, pre_tag = clip # Fixed: Uses filename and pre_tag
    context.user_data['current_clip_id'] = clip_id
    
    # Path construction fix
    video_path = os.path.join(CLIPS_DIR, filename)
    
    keyboard = get_keyboard_for_tag(pre_tag)
    
    caption = "🎬 شوف اللقطة\n\n"
    if pre_tag:
        caption += f"🔎 المحلل شافها **{pre_tag}**.\n**حدّد التفاصيل:**"
    else:
        caption += "**وش شفت؟**"
    
    if os.path.exists(video_path):
        try:
            with open(video_path, 'rb') as v:
                await msg.reply_video(video=v, caption=caption, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
        except Exception as e:
            logger.error(f"Error sending video: {e}")
            await msg.reply_text("خطأ في إرسال الفيديو.")
    else:
        # Fallback if file missing
        await msg.reply_text(f"❌ الفيديو غير موجود: {filename}")
        with get_db() as conn:
            conn.execute("UPDATE clip_assignments SET completed=1 WHERE clip_id=? AND user_id=?", (clip_id, user_id))
            conn.commit()
        await send_clip(update, context)

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == 'join_confirm':
        context.user_data['awaiting_nickname'] = True
        await query.edit_message_text("مليح! اعطيني **اسم العرض** (Nickname).", parse_mode='Markdown')
        
    elif query.data.startswith('tag_'):
        event = query.data.split('_', 1)[1]  # Handle multi-word events like DefensiveRetreat
        await handle_tag_logic(update, context, event)
        
    elif query.data.startswith('start_tag_'):
        clip_id = int(query.data.split('_')[-1])
        context.user_data['current_clip_id'] = clip_id
        await start_tagging_specific_clip(update, context, clip_id)
        
    elif query.data.startswith('decision_'):
        # Step 2: Decision quality response
        decision = query.data.split('_', 1)[1]
        await handle_decision_quality(update, context, decision)
        
    elif query.data == 'skip_decision':
        # Skip decision quality question
        context.user_data.pop('pending_decision_clip', None)
        await query.message.edit_caption(caption="✅ تم تسجيل الحدث!")
        await send_clip(update, context)
        
    elif query.data == 'admin_scan':
        await scan_local_files(update, context)
        
    elif query.data == 'admin_upload_prompt':         await query.edit_message_text("📤 أرسل ملف الفيديو الآن.")
        
    elif query.data.startswith('club_'):
        club = query.data.split('_')[1]
        user_id = query.effective_user.id
        with get_db() as conn:
            c = conn.cursor()
            c.execute("UPDATE users SET club = ? WHERE user_id = ?", (club, user_id))
            conn.commit()
        
        group_id = CLUB_GROUPS.get(club)
        msg = f"تم اختيار نادي **{club}**! 🛡️"
        if group_id:
            # Try to get invite link or just mention the group
            msg += f"\n\nيمكنك الانضمام إلى مجموعة المحللين الخاصة بناديك هنا: [مجموعة {club}](https://t.me/{group_id})"
        
        await query.edit_message_text(msg, parse_mode='Markdown', disable_web_page_preview=True)

    elif query.data.startswith('process_video_'):
        idx = int(query.data.split('_')[-1])
        files = context.user_data.get('video_files', [])
        if idx < len(files):
            file_path = os.path.join(UPLOADS_DIR, files[idx])
            await query.edit_message_text(f"جاري المعالجة: {files[idx]}...")


# Events that trigger the decision quality question
DECISION_EVENTS = ['KeyPass', 'HighPress', 'DefensiveRetreat', 'TacticalFoul', 'PositioningError']

async def handle_decision_quality(update: Update, context: ContextTypes.DEFAULT_TYPE, decision: str):
    """Handle the second step - decision quality assessment."""
    user_id = update.effective_user.id
    clip_id = context.user_data.get('pending_decision_clip')
    
    if not clip_id:
        await update.callback_query.answer("⚠️ لا يوجد حدث معلق", show_alert=True)
        return
    
    # Save decision quality as a separate tag
    with get_db() as conn:
        c = conn.cursor()
        c.execute("INSERT INTO tags (user_id, clip_id, event_type) VALUES (?, ?, ?)", 
                  (user_id, clip_id, f"Decision{decision}"))
        c.execute("UPDATE users SET xp = xp + 1, monthly_xp = monthly_xp + 1 WHERE user_id = ?", (user_id,))
        conn.commit()
    
    context.user_data.pop('pending_decision_clip', None)
    
    await update.callback_query.answer("شكراً! +1 XP 🎯")
    await update.callback_query.message.edit_caption(caption=f"✅ تم تسجيل: القرار كان {decision}")
    await send_clip(update, context)

async def handle_tag_logic(update: Update, context: ContextTypes.DEFAULT_TYPE, event: str):
    user_id = update.effective_user.id
    username = update.effective_user.username
    clip_id = context.user_data.get('current_clip_id')
    
    # Ensure user exists in DB before processing
    ensure_user_exists(user_id, username)
    
    # 1. Rules
    is_valid, reason = validate_tag_rules(user_id, clip_id, event)
    if not is_valid:
        await update.callback_query.answer(f"❌ {reason}", show_alert=True)
        if "Spam" in reason: update_trust_score(user_id, False, True)
        return

    # 2. Save & 3. Base XP (Atomic Transaction)
    with get_db() as conn:
        c = conn.cursor()
        # All updates in ONE transaction
        c.execute("INSERT INTO tags (user_id, clip_id, event_type) VALUES (?, ?, ?)", (user_id, clip_id, event))
        c.execute("UPDATE clip_assignments SET completed=1 WHERE clip_id=? AND user_id=?", (clip_id, user_id))
        
        xp_gain = 10  # Supporter analyse 1 clip → +10 points
        c.execute("UPDATE users SET xp = xp + ?, monthly_xp = monthly_xp + ? WHERE user_id = ?", (xp_gain, xp_gain, user_id))
        
        c.execute("SELECT xp FROM users WHERE user_id = ?", (user_id,))
        row = c.fetchone()
        new_xp = row[0] if row else 0
        conn.commit()

    # 4. Streak & Badges
    streak, _, bonus = update_streak(user_id)
    new_badges = check_and_award_badges(user_id, new_xp)
    if bonus: xp_gain += bonus
    
    msg = f"تم! +{xp_gain} XP"
    if new_badges: msg += f"\n🎉 شارة جديدة: {', '.join(new_badges)}"
    await update.callback_query.answer(msg)
    
    # Check if this event needs a follow-up decision quality question
    if event in DECISION_EVENTS:
        # Step 2: Ask about decision quality
        context.user_data['pending_decision_clip'] = clip_id
        decision_keyboard = [
            [InlineKeyboardButton("✅ صحيح", callback_data='decision_Correct'),
             InlineKeyboardButton("⏰ متأخر", callback_data='decision_Late'),
             InlineKeyboardButton("❌ خاطئ", callback_data='decision_Wrong')],
            [InlineKeyboardButton("⏭️ تخطي", callback_data='skip_decision')]
        ]
        await update.callback_query.message.edit_caption(
            caption=f"تم تسجيل: **{event}**\n\n**القرار كان؟**",
            reply_markup=InlineKeyboardMarkup(decision_keyboard),
            parse_mode='Markdown'
        )
        return  # Don't send next clip yet
    
    try:
        # Display localized message for the selected event
        display_event = event.replace('_', ' ')
        await update.callback_query.message.edit_caption(caption=f"✅ تم تسجيل: {display_event}")
    except Exception as e:
        # Ignore "Message is not modified" errors (e.g. clicking same button twice)
        if "Message is not modified" not in str(e):
            logger.error(f"Error editing caption: {e}")

    # 5. Consensus
    cons_event, status = calculate_crowd_consensus(clip_id)
    if status in ['confirmed', 'rejected']:
        with get_db() as conn:
            c = conn.cursor()
            
            # Timeline Check
            c.execute("SELECT match_id FROM clips WHERE clip_id=?", (clip_id,))
            match_id = c.fetchone()[0]
            consistent = check_timeline_consistency(match_id, cons_event)
            
            if not consistent: status = 'ambiguous'
            
            c.execute("UPDATE clips SET consensus_event=?, status=?, qc_stage='finalized' WHERE clip_id=?", (cons_event, status, clip_id))
            
            # Trust Update (Retroactive)
            c.execute("SELECT user_id, event_type FROM tags WHERE clip_id=?", (clip_id,))
            for uid, etype in c.fetchall():
                correct = (etype == cons_event)
                update_trust_score(uid, correct)
                
                if correct:
                    # Vote = majorité → +5 points bonus
                    bonus = 5
                    c.execute("UPDATE users SET xp = xp + ?, monthly_xp = monthly_xp + ? WHERE user_id = ?", (bonus, bonus, uid))
                
            conn.commit()

    await send_clip(update, context)

# --- ADMIN VIDEO LOGIC ---

async def show_admin_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    kb = [
        [InlineKeyboardButton("📂 Scan Files", callback_data='admin_scan')],
        [InlineKeyboardButton("📤 Upload Video", callback_data='admin_upload_prompt')]
    ]
    await update.message.reply_text("لوحة الأدمن:", reply_markup=InlineKeyboardMarkup(kb))

async def handle_video_upload(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_admin(update.effective_user.id): return
    
    video = update.message.video or update.message.document
    if not video: return

    # Validate file size (Telegram limit is 50MB for bots, but check anyway)
    if video.file_size > 50 * 1024 * 1024:  # 50MB
        await update.message.reply_text("❌ الملف كبير جداً (الحد الأقصى 50MB)")
        return
    
    # Validate file type
    if video.mime_type and not video.mime_type.startswith('video/'):
        await update.message.reply_text("❌ يجب أن يكون ملف فيديو")
        return

    progress_msg = await update.message.reply_text("📥 جاري التحميل... 0%")
    
    try:
        file_id = video.file_id
        new_file = await context.bot.get_file(file_id)
        
        save_path = os.path.join(UPLOADS_DIR, f"video_{file_id}.mp4")
        
        # Download with timeout
        await asyncio.wait_for(
            new_file.download_to_drive(save_path),
            timeout=300  # 5 minutes max
        )
        
        await progress_msg.edit_text("✅ تم التحميل! جاري المعالجة...")
        await process_video_async(update, save_path)
        
    except asyncio.TimeoutError:
        await progress_msg.edit_text("❌ انتهت المهلة - الملف كبير جداً")
    except Exception as e:
        logger.error(f"Upload error: {e}")
        await progress_msg.edit_text("❌ خطأ في التحميل")

async def scan_local_files(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_admin(update.effective_user.id): return
    files = [f for f in os.listdir(UPLOADS_DIR) if f.endswith('.mp4')]
    
    if not files:
        await update.effective_message.reply_text("لا توجد ملفات.")
        return
        
    context.user_data['video_files'] = files
    kb = []
    for i, f in enumerate(files):
        kb.append([InlineKeyboardButton(f[:30], callback_data=f'process_video_{i}')])
    await update.effective_message.reply_text("اختر ملف:", reply_markup=InlineKeyboardMarkup(kb))

async def process_video_async(update: Update, file_path: str):
    msg = update.effective_message or update.callback_query.message
    await msg.reply_text("⚙️ جاري التقطيع (في الخلفية)...")
    
    loop = asyncio.get_running_loop()
    try:
    # Non-blocking Execution
        clips = await loop.run_in_executor(None, generate_clips_from_video, file_path, CLIPS_DIR, -1)
        
        if clips:
            with get_db() as conn:
                c = conn.cursor()
                match_name = f"Match {os.path.basename(file_path)[:10]}"
                c.execute("INSERT INTO matches (name) VALUES (?)", (match_name,))
                match_id = c.lastrowid
                
                count = 0
                for cp in clips:
                    fname = os.path.basename(cp) # Store filename only
                    c.execute("INSERT INTO clips (match_id, filename) VALUES (?, ?)", (match_id, fname))
                    count += 1
                conn.commit()
            await msg.reply_text(f"✅ تم! {count} لقطة.")
        else:
            await msg.reply_text("❌ لم يتم استخراج أي لقطات.")
    except Exception as e:
        logger.error(f"Process error: {e}")
        await msg.reply_text("حدث خطأ في المعالجة.")

# --- STATS DISPLAY ---

async def show_leaderboard(update: Update, context: ContextTypes.DEFAULT_TYPE):
    with get_db() as conn:
        c = conn.cursor()
        # Overall
        c.execute("SELECT nickname, xp FROM users ORDER BY xp DESC LIMIT 10")
        rows_all = c.fetchall()
        
        # Monthly
        c.execute("SELECT nickname, monthly_xp FROM users ORDER BY monthly_xp DESC LIMIT 10")
        rows_month = c.fetchall()
    
    txt = "🏆 **الترتيب العام (Top 10):**\n" + "\n".join([f"{i+1}. {r[0]} ({r[1]} XP)" for i,r in enumerate(rows_all)])
    txt += "\n\n📅 **الترتيب الشهري (Top 10):**\n" + "\n".join([f"{i+1}. {r[0]} ({r[1]} XP)" for i,r in enumerate(rows_month)])
    
    await update.message.reply_text(txt, parse_mode='Markdown')

def award_monthly_badges():
    """Awads 'Analyste Or' to Top 10 monthly contributors and resets monthly_xp."""
    with get_db() as conn:
        c = conn.cursor()
        # Get Top 10
        c.execute("SELECT user_id FROM users ORDER BY monthly_xp DESC LIMIT 10")
        top_users = c.fetchall()
        
        for (uid,) in top_users:
            # Check if already has it for this month (simplified, just award it)
            c.execute("INSERT INTO badges (user_id, badge_type) VALUES (?, ?)", (uid, "Analyste Or"))
        
        # Reset monthly XP
        c.execute("UPDATE users SET monthly_xp = 0")
        conn.commit()

async def show_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    uid = update.effective_user.id
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT nickname, xp, streak_days, trust_score, accuracy, club, monthly_xp FROM users LEFT JOIN (SELECT user_id, 0 as accuracy FROM users) USING(user_id) WHERE user_id=?", (uid,))
        data = c.fetchone()
        c.execute("SELECT badge_type FROM badges WHERE user_id=?", (uid,))
        badges = [b[0] for b in c.fetchall()]
    
        if data:
            reward_status = "❌ لا توجد مكافآت بعد"
            if data[1] >= 10000: reward_status = "🎁 دعوة VIP لمباراة (تم الفوز!)"
            elif data[1] >= 5000: reward_status = "🔓 Early Access (تم الفوز!)"
            elif data[1] >= 1000: reward_status = "📜 شهادة رقمية FAF (تم الفوز!)"
            
            txt = (f"👤 **{data[0]}**\n"
                   f"🏁 النادي: {data[5] if data[5] else 'لم يختر بعد'}\n"
                   f"⭐ XP الكلي: {data[1]}\n"
                   f"🗓️ XP الشهر: {data[6]}\n"
                   f"🔥 Streak: {data[2]}\n"
                   f"🛡️ Trust: {data[3]}\n"
                   f"🏅 Badges: {', '.join(badges) if badges else 'لا توجد'}\n"
                   f"🎁 المكافأة الحالية: {reward_status}")
            await update.message.reply_text(txt, parse_mode='Markdown')

# --- PHASE 3: CLUBS & GROUPS ---

CLUB_GROUPS = {
    "MCA": os.getenv("MCA_GROUP_ID"),
    "CRB": os.getenv("CRB_GROUP_ID"),
    "ESS": os.getenv("ESS_GROUP_ID")
}

async def choisir_club(update: Update, context: ContextTypes.DEFAULT_TYPE):
    kb = [
        [InlineKeyboardButton("MCA (Mouloudia d'Alger)", callback_data='club_MCA')],
        [InlineKeyboardButton("CRB (CR Belouizdad)", callback_data='club_CRB')],
        [InlineKeyboardButton("ESS (ES Sétif)", callback_data='club_ESS')]
    ]
    await update.message.reply_text("اختر ناديك المفضل للانضمام إلى مجموعته الخاصة:", reply_markup=InlineKeyboardMarkup(kb))

async def show_club_competition(update: Update, context: ContextTypes.DEFAULT_TYPE):
    with get_db() as conn:
        c = conn.cursor()
        c.execute('''
            SELECT club, SUM(xp) as total_xp, COUNT(user_id) as members 
            FROM users 
            WHERE club IS NOT NULL 
            GROUP BY club 
            ORDER BY total_xp DESC
        ''')
        rows = c.fetchall()
    
    if not rows:
        await update.message.reply_text("لا توجد منافسات حالياً. اختر ناديك وابدأ التحليل!")
        return
        
    txt = "🏁 **منافسة الأندية (Ranking):**\n\n"
    for i, (club, xp, members) in enumerate(rows):
        txt += f"{i+1}. {club}: {xp} XP ({members} عضو) 👤\n"
    
    await update.message.reply_text(txt, parse_mode='Markdown')

# --- BACKGROUND JOBS ---

async def check_for_new_clips(context: ContextTypes.DEFAULT_TYPE):
    """Periodically check for clips that haven't been announced yet."""
    if not ANNOUNCEMENT_CHAT_ID:
        logger.warning("🚫 ANNOUNCEMENT_CHAT_ID not set. Skipping proactive notifications.")
        return

    logger.info(f"🔍 Checking for new clips to announce (Chat ID: {ANNOUNCEMENT_CHAT_ID})")
    try:
        with get_db() as conn:
            c = conn.cursor()
            # 1. Check for PRIORITY clips first
            c.execute('''
                SELECT c.clip_id, c.filename, m.name, c.pre_tag 
                FROM clips c
                JOIN matches m ON c.match_id = m.match_id
                WHERE c.is_announced = 0 AND c.status = 'pending' AND c.is_priority = 1
                ORDER BY c.clip_id ASC
            ''')
            priority_clips = c.fetchall()
            
            if priority_clips:
                logger.info(f"🔥 PRIORITY clips found: {len(priority_clips)}. Suspending regular queue.")
                new_clips = priority_clips[:1] # ONLY send the first priority one to satisfy "Only it" requirement
            else:
                # 2. Otherwise send regular clips
                c.execute('''
                    SELECT c.clip_id, c.filename, m.name, c.pre_tag 
                    FROM clips c
                    JOIN matches m ON c.match_id = m.match_id
                    WHERE c.is_announced = 0 AND c.status = 'pending'
                    ORDER BY c.clip_id ASC
                    LIMIT 2
                ''')
                new_clips = c.fetchall()
            
            if not new_clips:
                logger.info("ℹ️ No new clips to announce.")
                return
            announced_count = 0
            for clip_id, filename, match_name, pre_tag in new_clips:
                if announced_count >= 5: # Limit announcements per cycle to avoid spamming
                    break

                video_path = os.path.join(CLIPS_DIR, filename)
                if not os.path.exists(video_path):
                    # Don't log individual missing files if there are many, just keep track
                    c.execute("UPDATE clips SET is_announced = 1 WHERE clip_id = ?", (clip_id,))
                    continue

                # Deep link to bot for private tagging
                bot_info = await context.bot.get_me()
                deep_link = f"https://t.me/{bot_info.username}?start=tag_{clip_id}"
                
                keyboard = [
                    [InlineKeyboardButton("🎯 حلل هذه اللقطة", url=deep_link)]
                ]
                
                logger.info(f"📤 Sending clip {clip_id} ({filename}) to {ANNOUNCEMENT_CHAT_ID}...")
                try:
                    caption_text = f"⚽ **لقطة جديدة للتحليل!**\n🏟️ المباراة: {match_name}\n"
                    if pre_tag:
                        caption_text = f"⚽ **تحليل {pre_tag}!**\n🏟️ المباراة: {match_name}\n"
                    
                    caption_text += "\nاضغط على الزر تحت باش تبدأ التاغينغ 👇"

                    await context.bot.send_video(
                        chat_id=ANNOUNCEMENT_CHAT_ID,
                        video=open(video_path, 'rb'),
                        caption=caption_text,
                        reply_markup=InlineKeyboardMarkup(keyboard),
                        parse_mode='Markdown'
                    )
                    c.execute("UPDATE clips SET is_announced = 1 WHERE clip_id = ?", (clip_id,))
                    logger.info(f"✅ Successfully broadcasted clip {clip_id}")
                    announced_count += 1
                except Exception as e:
                    logger.error(f"❌ Error broadcasting clip {clip_id}: {e}")
            
            conn.commit()
    except Exception as e:
        logger.error(f"❌ Database error in check_for_new_clips: {e}")

# --- MAIN ---
if __name__ == '__main__':
    if not TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN missing!")
        exit(1)
        
    init_db()
    
    # Fix for TimedOut/RuntimeError
    from telegram.request import HTTPXRequest
    request = HTTPXRequest(connect_timeout=20, read_timeout=20)
    app = ApplicationBuilder().token(TOKEN).request(request).build()
    
    # Register background jobs
    if app.job_queue:
        app.job_queue.run_repeating(check_for_new_clips, interval=30, first=10)
        logger.info("⏰ JobQueue started: checking for new clips every 30s")
    else:
        logger.warning("⚠️ JobQueue not available. Proactive notifications disabled.")

    app.add_handler(CommandHandler('start', start))
    app.add_handler(CommandHandler('get_id', get_id))
    app.add_handler(CommandHandler('scan', scan_local_files))
    app.add_handler(CommandHandler('choisir_club', choisir_club))
    app.add_handler(CommandHandler('competition_clubs', show_club_competition))
    app.add_handler(CommandHandler('reset_mois', lambda u, c: award_monthly_badges() if is_admin(u.effective_user.id) else None))
    app.add_handler(CallbackQueryHandler(button_handler))
    app.add_handler(MessageHandler(filters.VIDEO | filters.Document.VIDEO, handle_video_upload))
    app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), message_handler))
    
    print("🚀 TactaBot Full Version Running...")
    app.run_polling()