import os
import logging
import sqlite3
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Tuple, List, Dict, Any
from contextlib import contextmanager

# Third-party imports
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder, 
    ContextTypes, 
    CommandHandler, 
    MessageHandler, 
    filters, 
    CallbackQueryHandler
)

# --- CONFIGURATION & ENVIRONMENT ---
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# --- LOGGING SETUP ---
# Detailed logging configuration for debugging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO,
    handlers=[
        logging.FileHandler('tactabot.log'), # Save logs to file
        logging.StreamHandler()              # Print logs to console
    ]
)
logger = logging.getLogger(__name__)

# --- CONSTANTS & SETTINGS ---
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
# Parse Admin IDs from .env string (e.g., "123,456")
ADMIN_IDS = [x.strip() for x in os.getenv("ADMIN_IDS", "").split(",") if x.strip()]

# XP & Gamification Settings
XP_TAG_BASE = 1
XP_TAG_CORRECT = 5
XP_DAILY_BONUS = 20
DAILY_TAG_THRESHOLD = 10
SPAM_COOLDOWN_SECONDS = 2.0
CONSENSUS_THRESHOLD = 3
TRUST_THRESHOLD_VOTE = 20

# Valid Event Types
VALID_EVENTS = [
    'Goal', 'KeyPass', 'Pass', 'Defense', 
    'Press', 'Foul', 'Card', 'Offside', 'None'
]

# Badge Thresholds
BADGE_THRESHOLDS = {
    'Bronze': 100,
    'Silver': 500,
    'Gold': 2000,
    'Platinum': 5000,
    'Diamond': 10000
}

# --- DYNAMIC PATHS (Fixes FileNotFound Errors) ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'tactabot.db')
UPLOADS_DIR = os.path.join(BASE_DIR, '..', 'public', 'uploads')
CLIPS_DIR = os.path.join(BASE_DIR, '..', 'public', 'clips')

# Ensure required directories exist
for directory in [UPLOADS_DIR, CLIPS_DIR]:
    os.makedirs(directory, exist_ok=True)

# --- CLIP GENERATOR IMPORT ---
try:
    from clip_generator import generate_clips_from_video
    CLIP_GENERATOR_AVAILABLE = True
except ImportError:
    logger.warning("⚠️ clip_generator.py NOT FOUND. Video processing will be disabled.")
    CLIP_GENERATOR_AVAILABLE = False
    def generate_clips_from_video(p, o, n=-1): return []

# --- DATABASE MANAGEMENT ---

@contextmanager
def get_db_connection():
    """Context manager for safe database connections."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Allows accessing columns by name
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Database Transaction Error: {e}")
        raise
    finally:
        conn.close()

def init_db():
    """Initialize the database with the complete schema."""
    with get_db_connection() as conn:
        c = conn.cursor()
        
        # 1. Users Table
        c.execute('''CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            nickname TEXT,
            xp INTEGER DEFAULT 0,
            trust_score INTEGER DEFAULT 50,
            noise_score INTEGER DEFAULT 0,
            is_elite BOOLEAN DEFAULT 0,
            streak_days INTEGER DEFAULT 0,
            tags_today INTEGER DEFAULT 0,
            last_tag_date TEXT,
            total_tags INTEGER DEFAULT 0,
            correct_tags INTEGER DEFAULT 0,
            joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # 2. Matches Table
        c.execute('''CREATE TABLE IF NOT EXISTS matches (
            match_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            status TEXT DEFAULT 'live',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # 3. Clips Table (Using 'filename' instead of 'video_path')
        c.execute('''CREATE TABLE IF NOT EXISTS clips (
            clip_id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            qc_stage TEXT DEFAULT 'crowd_voting',
            required_tags INTEGER DEFAULT 3,
            consensus_event TEXT,
            status TEXT DEFAULT 'pending',
            quality_tag TEXT,
            final_event_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            finalized_at TIMESTAMP,
            FOREIGN KEY(match_id) REFERENCES matches(match_id) ON DELETE CASCADE
        )''')

        # 4. Tags Table
        c.execute('''CREATE TABLE IF NOT EXISTS tags (
            tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            clip_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            vote_weight REAL DEFAULT 1.0,
            is_correct BOOLEAN DEFAULT NULL,
            FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE,
            FOREIGN KEY(clip_id) REFERENCES clips(clip_id) ON DELETE CASCADE
        )''')

        # 5. Clip Assignments Table
        c.execute('''CREATE TABLE IF NOT EXISTS clip_assignments (
            assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            clip_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            completed BOOLEAN DEFAULT 0,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(clip_id) REFERENCES clips(clip_id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE,
            UNIQUE(clip_id, user_id)
        )''')

        # 6. Badges Table
        c.execute('''CREATE TABLE IF NOT EXISTS badges (
            badge_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            badge_type TEXT NOT NULL,
            awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE,
            UNIQUE(user_id, badge_type)
        )''')

        # Create Indexes for Performance
        c.execute('CREATE INDEX IF NOT EXISTS idx_tags_clip ON tags(clip_id)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_clips_status ON clips(status)')
        
        logger.info("✅ Database initialized successfully with correct schema.")

# --- CORE LOGIC & ALGORITHMS ---

def is_admin(user_id: int) -> bool:
    """Check if a user is in the ADMIN_IDS list."""
    return str(user_id) in ADMIN_IDS

def validate_tag_rules(user_id: int, clip_id: int, event_type: str) -> Tuple[bool, str]:
    """
    QC Stage 1: Rule Validation
    - Checks for spam (too fast).
    - Checks for valid event type.
    """
    with get_db_connection() as conn:
        c = conn.cursor()
        # Spam Check
        c.execute("""
            SELECT timestamp FROM tags 
            WHERE user_id = ? 
            ORDER BY timestamp DESC LIMIT 1
        """, (user_id,))
        last_tag = c.fetchone()
        
        if last_tag:
            last_time = datetime.strptime(last_tag['timestamp'], '%Y-%m-%d %H:%M:%S')
            diff = (datetime.now() - last_time).total_seconds()
            if diff < SPAM_COOLDOWN_SECONDS:
                return False, f"⏱️ مهلاً! انتظر {SPAM_COOLDOWN_SECONDS} ثانية بين التاغات."

    if event_type not in VALID_EVENTS:
        return False, "❌ نوع الحدث غير صحيح."
        
    return True, "Valid"

def calculate_crowd_consensus(clip_id: int) -> Tuple[Optional[str], str]:
    """
    QC Stage 2: Crowd Consensus
    - Requires at least 3 votes from trusted users to confirm.
    - If 5 votes and no consensus -> Elite Review.
    """
    with get_db_connection() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT t.event_type, u.trust_score 
            FROM tags t 
            JOIN users u ON t.user_id = u.user_id 
            WHERE t.clip_id = ?
        """, (clip_id,))
        tags = c.fetchall()
        
    if not tags:
        return None, "pending"

    vote_counts = {}
    total_trusted_votes = 0
    
    for tag in tags:
        event = tag['event_type']
        trust = tag['trust_score'] or 50
        
        # Only count votes from users with some trust
        if trust > TRUST_THRESHOLD_VOTE:
            vote_counts[event] = vote_counts.get(event, 0) + 1
            total_trusted_votes += 1
    
    # Check for Majority (3 Votes)
    for event, count in vote_counts.items():
        if count >= CONSENSUS_THRESHOLD:
            if event == 'None':
                return event, "rejected"
            return event, "confirmed"
    
    # If too many votes without consensus, escalate
    if total_trusted_votes >= 5:
        return None, "elite_review"
        
    return None, "crowd_voting"

def update_trust_score(user_id: int, was_correct: bool, is_spam: bool = False):
    """
    QC Stage 3: Reputation System
    - Correct: +Trust, +CorrectTags
    - Incorrect: -Trust
    - Spam: -Trust (Heavy), +NoiseScore
    """
    with get_db_connection() as conn:
        c = conn.cursor()
        
        if is_spam:
            c.execute("""
                UPDATE users 
                SET noise_score = noise_score + 10, 
                    trust_score = MAX(0, trust_score - 5) 
                WHERE user_id = ?
            """, (user_id,))
        elif was_correct:
            c.execute("""
                UPDATE users 
                SET trust_score = MIN(100, trust_score + 1),
                    correct_tags = correct_tags + 1
                WHERE user_id = ?
            """, (user_id,))
        else:
            c.execute("""
                UPDATE users 
                SET trust_score = MAX(0, trust_score - 2) 
                WHERE user_id = ?
            """, (user_id,))
            
        # Always increment total tags
        c.execute("UPDATE users SET total_tags = total_tags + 1 WHERE user_id = ?", (user_id,))

def check_timeline_consistency(match_id: int, event_type: str) -> bool:
    """
    QC Stage 5: Timeline Consistency
    - Prevents impossible sequences (e.g. 2 Goals in 10 seconds).
    """
    with get_db_connection() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT final_event_type, created_at 
            FROM clips 
            WHERE match_id = ? AND status = 'confirmed' 
            ORDER BY created_at DESC LIMIT 1
        """, (match_id,))
        last_event = c.fetchone()
        
    if last_event:
        last_type = last_event['final_event_type']
        last_time = datetime.strptime(last_event['created_at'], '%Y-%m-%d %H:%M:%S')
        diff = (datetime.now() - last_time).total_seconds()
        
        # Rule: No duplicate Goals within 30 seconds
        if last_type == 'Goal' and event_type == 'Goal' and diff < 30:
            return False
            
    return True

def assign_clip_to_user(user_id: int) -> Optional[Tuple[int, str]]:
    """
    Intelligent Assignment Logic.
    Returns (clip_id, filename) or None.
    """
    with get_db_connection() as conn:
        c = conn.cursor()
        
        # Get User Rank
        c.execute("SELECT is_elite, trust_score FROM users WHERE user_id = ?", (user_id,))
        user_data = c.fetchone()
        is_elite = user_data['is_elite'] if user_data else 0
        trust_score = user_data['trust_score'] if user_data else 50
        
        clip = None

        # 1. Elite Queue (For High Trust Users)
        if is_elite or trust_score > 80:
            c.execute("""
                SELECT clip_id, filename FROM clips 
                WHERE qc_stage = 'elite_review' 
                AND clip_id NOT IN (SELECT clip_id FROM clip_assignments WHERE user_id = ?)
                LIMIT 1
            """, (user_id,))
            clip = c.fetchone()

        # 2. General Crowd Queue
        if not clip:
            c.execute("""
                SELECT c.clip_id, c.filename 
                FROM clips c
                WHERE c.qc_stage = 'crowd_voting'
                AND (SELECT COUNT(*) FROM tags WHERE clip_id = c.clip_id) < c.required_tags
                AND c.clip_id NOT IN (SELECT clip_id FROM clip_assignments WHERE user_id = ?)
                ORDER BY RANDOM()
                LIMIT 1
            """, (user_id,))
            clip = c.fetchone()
        
        # Assign if found
        if clip:
            try:
                c.execute("""
                    INSERT INTO clip_assignments (clip_id, user_id) 
                    VALUES (?, ?)
                """, (clip['clip_id'], user_id))
                return (clip['clip_id'], clip['filename'])
            except sqlite3.IntegrityError:
                # Race condition handled silently
                pass
                
    return None

def update_streak(user_id: int) -> Tuple[int, int, int]:
    """Updates daily streak and calculates daily bonus."""
    with get_db_connection() as conn:
        c = conn.cursor()
        
        today = datetime.now().date().isoformat()
        yesterday = (datetime.now() - timedelta(days=1)).date().isoformat()
        
        c.execute("SELECT last_tag_date, streak_days, tags_today FROM users WHERE user_id = ?", (user_id,))
        result = c.fetchone()
        
        streak_days, tags_today, bonus_xp = 1, 1, 0

        if result:
            last_date = result['last_tag_date']
            streak_days = result['streak_days'] or 1
            tags_today = result['tags_today'] or 0
            
            if last_date == today:
                tags_today += 1
            elif last_date == yesterday:
                streak_days += 1
                tags_today = 1
            else:
                streak_days = 1
                tags_today = 1
            
            c.execute("""
                UPDATE users 
                SET last_tag_date = ?, streak_days = ?, tags_today = ? 
                WHERE user_id = ?
            """, (today, streak_days, tags_today, user_id))
            
            if tags_today == DAILY_TAG_THRESHOLD:
                bonus_xp = XP_DAILY_BONUS
                c.execute("UPDATE users SET xp = xp + ? WHERE user_id = ?", (bonus_xp, user_id))
        
    return streak_days, tags_today, bonus_xp

def check_and_award_badges(user_id: int, new_xp: int) -> List[str]:
    """Checks XP against thresholds and awards new badges."""
    with get_db_connection() as conn:
        c = conn.cursor()
        c.execute("SELECT badge_type FROM badges WHERE user_id = ?", (user_id,))
        existing = {row['badge_type'] for row in c.fetchall()}
        
        awarded = []
        for badge, threshold in BADGE_THRESHOLDS.items():
            if new_xp >= threshold and badge not in existing:
                try:
                    c.execute("INSERT INTO badges (user_id, badge_type) VALUES (?, ?)", (user_id, badge))
                    awarded.append(badge)
                except sqlite3.IntegrityError:
                    pass
    return awarded

# --- TELEGRAM BOT HANDLERS ---

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command."""
    user = update.effective_user
    context.user_data.clear()

    with get_db_connection() as conn:
        c = conn.cursor()
        c.execute("SELECT nickname FROM users WHERE user_id = ?", (user.id,))
        result = c.fetchone()

    if result and result['nickname']:
        await update.message.reply_text(
            f"👋 أهلاً بك مجدداً، **{result['nickname']}**!",
            parse_mode='Markdown'
        )
        await show_main_menu(update, context)
    else:
        keyboard = [[InlineKeyboardButton("🚀 انضم الآن!", callback_data='join_confirm')]]
        await update.message.reply_text(
            "🎯 **أهلاً بك في TactaBot!**\n\n"
            "منصة تحليل الفيديو بالذكاء الجماعي.\n"
            "هل أنت مستعد للانضمام؟",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )

async def message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Router for all text messages."""
    user = update.effective_user
    text = update.message.text
    
    # 1. Registration Flow
    if context.user_data.get('awaiting_nickname'):
        nickname = text.strip()
        if len(nickname) < 2 or len(nickname) > 20:
            await update.message.reply_text("❌ الاسم يجب أن يكون بين 2 و 20 حرف.")
            return
        
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute("""
                INSERT OR REPLACE INTO users (user_id, username, nickname) 
                VALUES (?, ?, ?)
            """, (user.id, user.username, nickname))
        
        context.user_data['awaiting_nickname'] = False
        await update.message.reply_text(f"✅ تم التسجيل! أهلاً يا **{nickname}**.", parse_mode='Markdown')
        await show_main_menu(update, context)
        return

    # 2. Main Menu Commands
    if text == "⚽ ابدأ التاغينغ":
        await send_clip(update, context)
    elif text == "🏆 الترتيب الأسبوعي":
        await show_leaderboard(update, context)
    elif text == "📊 إحصائياتي":
        await show_stats(update, context)
    elif text == "📹 إدارة الفيديوهات":
        if is_admin(user.id):
            await show_admin_menu(update, context)
        else:
            await update.message.reply_text("⛔ هذا الأمر للمشرفين فقط.")
    elif text == "ℹ️ المساعدة":
        await show_help(update, context)

async def show_main_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Displays the main keyboard menu."""
    kb = [
        ["⚽ ابدأ التاغينغ", "🏆 الترتيب الأسبوعي"],
        ["📊 إحصائياتي", "ℹ️ المساعدة"]
    ]
    if is_admin(update.effective_user.id):
        kb.append(["📹 إدارة الفيديوهات"])
    
    await update.message.reply_text(
        "القائمة الرئيسية:",
        reply_markup=ReplyKeyboardMarkup(kb, resize_keyboard=True)
    )

async def send_clip(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Fetches a clip assignment and sends the video."""
    user_id = update.effective_user.id
    clip = assign_clip_to_user(user_id)
    
    msg = update.callback_query.message if update.callback_query else update.message

    if not clip:
        await msg.reply_text(
            "🎉 **عمل رائع!**\n"
            "لقد قمت بتحليل جميع اللقطات المتوفرة حالياً.\n"
            "عد لاحقاً للمزيد!",
            parse_mode='Markdown'
        )
        return

    clip_id, filename = clip
    context.user_data['current_clip_id'] = clip_id
    
    # Construct absolute path safely
    video_path = os.path.join(CLIPS_DIR, filename)
    
    # Tagging Keyboard
    keyboard = [
        [InlineKeyboardButton("⚽ هدف", callback_data='tag_Goal'), InlineKeyboardButton("🎯 تمريرة حاسمة", callback_data='tag_KeyPass')],
        [InlineKeyboardButton("🔁 تمريرة", callback_data='tag_Pass'), InlineKeyboardButton("🛡️ دفاع", callback_data='tag_Defense')],
        [InlineKeyboardButton("🔥 ضغط", callback_data='tag_Press'), InlineKeyboardButton("⚠️ فاول", callback_data='tag_Foul')],
        [InlineKeyboardButton("🟨 كارت", callback_data='tag_Card'), InlineKeyboardButton("🚩 أوفسايد", callback_data='tag_Offside')],
        [InlineKeyboardButton("❌ لا شيء/غير واضح", callback_data='tag_None')]
    ]
    
    if os.path.exists(video_path):
        try:
            with open(video_path, 'rb') as video_file:
                await msg.reply_video(
                    video=video_file,
                    caption=f"🎬 **Clip #{clip_id}**\nما هو الحدث الأبرز؟",
                    reply_markup=InlineKeyboardMarkup(keyboard),
                    parse_mode='Markdown'
                )
        except Exception as e:
            logger.error(f"Failed to send video {filename}: {e}")
            await msg.reply_text("❌ حدث خطأ أثناء إرسال الفيديو.")
    else:
        # Handle Missing File gracefully
        logger.warning(f"File missing on disk: {video_path}")
        await msg.reply_text(f"⚠️ الملف غير موجود: {filename}. جاري الانتقال للتالي...")
        
        # Mark as completed so user doesn't get stuck loop
        with get_db_connection() as conn:
            conn.execute("UPDATE clip_assignments SET completed=1 WHERE clip_id=? AND user_id=?", (clip_id, user_id))
        
        # Recursive call to get next clip
        await send_clip(update, context)

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Callback query handler for inline buttons."""
    query = update.callback_query
    await query.answer()
    
    if query.data == 'join_confirm':
        context.user_data['awaiting_nickname'] = True
        await query.edit_message_text("📝 ممتاز! اكتب اسمك المستعار (Nickname) الآن:")
        
    elif query.data.startswith('tag_'):
        event = query.data.split('_')[1]
        await handle_tag_logic(update, context, event)
        
    elif query.data == 'admin_scan':
        await scan_local_files(update, context)
        
    elif query.data == 'admin_upload_prompt':
        await query.edit_message_text("📤 قم بإرسال ملف الفيديو الآن (MP4).")
        
    elif query.data.startswith('process_video_'):
        # Extract index from callback data
        try:
            idx = int(query.data.split('_')[-1])
            files = context.user_data.get('video_files', [])
            if idx < len(files):
                file_path = os.path.join(UPLOADS_DIR, files[idx])
                await query.edit_message_text(f"⚙️ جاري معالجة: {files[idx]}...")
                await process_video_async(update, file_path)
            else:
                await query.edit_message_text("❌ الملف لم يعد متاحاً.")
        except ValueError:
            pass

async def handle_tag_logic(update: Update, context: ContextTypes.DEFAULT_TYPE, event: str):
    """
    The Core Engine: Handles tagging, scoring, and consensus logic.
    """
    user_id = update.effective_user.id
    clip_id = context.user_data.get('current_clip_id')
    
    if not clip_id:
        await update.callback_query.answer("⚠️ الجلسة منتهية.", show_alert=True)
        return

    # 1. Rule Validation
    is_valid, reason = validate_tag_rules(user_id, clip_id, event)
    if not is_valid:
        await update.callback_query.answer(f"❌ {reason}", show_alert=True)
        if "Spam" in reason:
            update_trust_score(user_id, False, is_spam=True)
        return

    # 2. Save Tag & Update User
    with get_db_connection() as conn:
        c = conn.cursor()
        # Insert Tag
        c.execute("INSERT INTO tags (user_id, clip_id, event_type) VALUES (?, ?, ?)", 
                  (user_id, clip_id, event))
        
        # Mark Assignment Complete
        c.execute("UPDATE clip_assignments SET completed=1 WHERE clip_id=? AND user_id=?", 
                  (clip_id, user_id))
        
        # Award Base XP
        c.execute("UPDATE users SET xp = xp + ? WHERE user_id=?", (XP_TAG_BASE, user_id))
        
        # Fetch new XP for badge check
        c.execute("SELECT xp FROM users WHERE user_id=?", (user_id,))
        new_xp = c.fetchone()['xp']

    # 3. Process Streaks & Badges
    streak, tags_today, bonus = update_streak(user_id)
    new_badges = check_and_award_badges(user_id, new_xp)
    
    # 4. User Feedback
    msg = f"✅ تم! +{XP_TAG_BASE} XP"
    if bonus: msg += f"\n🎁 بونص يومي: +{bonus} XP"
    if streak > 1: msg += f"\n🔥 Streak: {streak} يوم"
    if new_badges: msg += f"\n🏅 شارة جديدة: {', '.join(new_badges)}"
    
    await update.callback_query.answer(msg, show_alert=True)
    await update.callback_query.edit_message_caption(
        caption=f"✅ تم التصويت: **{event}**",
        parse_mode='Markdown'
    )

    # 5. Consensus & QC Logic
    consensus_event, status = calculate_crowd_consensus(clip_id)
    
    if status in ['confirmed', 'rejected']:
        with get_db_connection() as conn:
            c = conn.cursor()
            
            # Get Match ID for Timeline Logic
            c.execute("SELECT match_id FROM clips WHERE clip_id=?", (clip_id,))
            match_row = c.fetchone()
            match_id = match_row['match_id'] if match_row else 0
            
            final_status = status
            
            # Timeline Check (Only for confirmed events)
            if status == 'confirmed' and not check_timeline_consistency(match_id, consensus_event):
                final_status = 'ambiguous'
                logger.info(f"Clip {clip_id} marked ambiguous due to timeline inconsistency.")
            
            # Determine Quality Tag
            quality_tag = 'high_confidence' if final_status == 'confirmed' else 'ambiguous'
            if final_status == 'rejected': quality_tag = 'rejected'
            
            # Finalize Clip in DB
            c.execute("""
                UPDATE clips 
                SET consensus_event=?, status=?, qc_stage='finalized', 
                    quality_tag=?, final_event_type=?, finalized_at=CURRENT_TIMESTAMP 
                WHERE clip_id=?
            """, (consensus_event, final_status, quality_tag, consensus_event, clip_id))
            
            # 6. Retroactive Reputation Update
            c.execute("SELECT user_id, event_type FROM tags WHERE clip_id=?", (clip_id,))
            tags = c.fetchall()
            
            for tag in tags:
                uid = tag['user_id']
                u_event = tag['event_type']
                
                # Determine correctness
                is_correct = False
                if final_status == 'confirmed':
                    is_correct = (u_event == consensus_event)
                elif final_status == 'rejected':
                    is_correct = (u_event == 'None')
                
                # Update Trust
                update_trust_score(uid, is_correct)
                
                # Mark tag as correct/incorrect in DB
                c.execute("UPDATE tags SET is_correct=? WHERE clip_id=? AND user_id=?", 
                          (is_correct, clip_id, uid))
                
                # Award Accuracy XP Bonus
                if is_correct:
                    c.execute("UPDATE users SET xp = xp + ? WHERE user_id=?", 
                              (XP_TAG_CORRECT, uid))

    # 7. Move to next clip
    await send_clip(update, context)

# --- ADMIN FUNCTIONS ---

async def show_admin_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin Control Panel."""
    kb = [
        [InlineKeyboardButton("📂 فحص الملفات (Scan)", callback_data='admin_scan')],
        [InlineKeyboardButton("📤 رفع فيديو جديد", callback_data='admin_upload_prompt')]
    ]
    await update.message.reply_text(
        "🛠️ **لوحة تحكم المشرفين**",
        reply_markup=InlineKeyboardMarkup(kb),
        parse_mode='Markdown'
    )

async def handle_video_upload(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle direct file uploads by admin."""
    if not is_admin(update.effective_user.id): return

    video = update.message.video or update.message.document
    if not video: return

    await update.message.reply_text("⏳ جاري التحميل...")
    
    try:
        f = await context.bot.get_file(video.file_id)
        # Generate clean filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        clean_name = f"upload_{timestamp}.mp4"
        save_path = os.path.join(UPLOADS_DIR, clean_name)
        
        await f.download_to_drive(save_path)
        await update.message.reply_text(f"✅ تم التحميل: `{clean_name}`\n⚙️ جاري التقطيع...")
        
        # Trigger processing
        await process_video_async(update, save_path)
        
    except Exception as e:
        logger.error(f"Upload Error: {e}")
        await update.message.reply_text(f"❌ حدث خطأ: {e}")

async def scan_local_files(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Scan the uploads folder for unprocessed videos."""
    if not is_admin(update.effective_user.id): return
    
    # Filter for video files
    files = [f for f in os.listdir(UPLOADS_DIR) if f.lower().endswith(('.mp4', '.avi', '.mov'))]
    
    if not files:
        await update.effective_message.reply_text("📂 المجلد `public/uploads` فارغ.")
        return
        
    context.user_data['video_files'] = files
    
    # Create buttons for files (Limit to first 10 to avoid size limits)
    kb = []
    for i, f in enumerate(files[:10]):
        # Truncate name for button
        display_name = (f[:25] + '..') if len(f) > 25 else f
        kb.append([InlineKeyboardButton(f"🎬 {display_name}", callback_data=f'process_video_{i}')])
        
    await update.effective_message.reply_text(
        f"📂 وجدنا {len(files)} ملفات. اختر ملفاً للمعالجة:",
        reply_markup=InlineKeyboardMarkup(kb)
    )

async def process_video_async(update: Update, file_path: str):
    """
    Runs the video processing logic in a separate thread (Executor)
    to prevent blocking the Telegram bot main loop.
    """
    msg = update.effective_message or update.callback_query.message
    
    if not CLIP_GENERATOR_AVAILABLE:
        await msg.reply_text("❌ مكتبة `clip_generator.py` غير موجودة.")
        return

    await msg.reply_text("⚙️ جاري المعالجة والتقطيع (قد يستغرق وقتاً)...")
    
    loop = asyncio.get_running_loop()
    
    try:
        # EXECUTE BLOCKING CODE IN THREAD
        clips = await loop.run_in_executor(
            None, 
            generate_clips_from_video, 
            file_path, 
            CLIPS_DIR, 
            -1 # Auto-detect number of clips
        )
        
        if clips:
            with get_db_connection() as conn:
                c = conn.cursor()
                
                # Create Match Entry
                match_name = f"Match {os.path.basename(file_path)[:15]}"
                c.execute("INSERT INTO matches (name, status) VALUES (?, 'live')", (match_name,))
                match_id = c.lastrowid
                
                # Insert Clips
                count = 0
                for clip_path in clips:
                    # IMPORTANT: Store only filename!
                    filename = os.path.basename(clip_path)
                    c.execute("""
                        INSERT INTO clips (match_id, filename, qc_stage) 
                        VALUES (?, ?, 'crowd_voting')
                    """, (match_id, filename))
                    count += 1
            
            await msg.reply_text(f"✅ **تمت العملية بنجاح!**\n💾 تم إضافة {count} لقطة لقاعدة البيانات.", parse_mode='Markdown')
        else:
            await msg.reply_text("⚠️ لم يتم استخراج أي لقطات. تحقق من محتوى الفيديو.")
            
    except Exception as e:
        logger.error(f"Processing Failed: {e}")
        await msg.reply_text("❌ حدث خطأ داخلي أثناء المعالجة.")

# --- STATS & LEADERBOARD ---

async def show_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Displays detailed user statistics."""
    user_id = update.effective_user.id
    
    with get_db_connection() as conn:
        c = conn.cursor()
        
        # 1. Fetch User Data (Simple Select)
        c.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        user = c.fetchone()
        
        # 2. Fetch Badges
        c.execute("SELECT badge_type FROM badges WHERE user_id = ?", (user_id,))
        badges = [b['badge_type'] for b in c.fetchall()]
        
        # 3. Calculate Rank
        if user:
            c.execute("SELECT COUNT(*) as rank FROM users WHERE xp > ?", (user['xp'],))
            rank = c.fetchone()['rank'] + 1
            
    if not user:
        await update.message.reply_text("❌ ليس لديك حساب بعد.")
        return

    # Calculate Accuracy in Python to avoid SQL errors
    total = user['total_tags'] or 0
    correct = user['correct_tags'] or 0
    accuracy = (correct / total * 100) if total > 0 else 0.0
    
    # Format Badges
    badge_icons = {"Bronze": "🥉", "Silver": "🥈", "Gold": "🥇", "Platinum": "💎", "Diamond": "👑"}
    badges_str = ", ".join([f"{badge_icons.get(b, '🏅')} {b}" for b in badges]) if badges else "لا يوجد"
    
    text = (
        f"👤 **الملف الشخصي: {user['nickname']}**\n\n"
        f"📊 **الترتيب العالمي:** #{rank}\n"
        f"⭐ **نقاط الخبرة (XP):** {user['xp']}\n"
        f"🛡️ **معدل الثقة:** {user['trust_score']}/100\n"
        f"🎯 **الدقة:** {accuracy:.1f}%\n"
        f"🔥 **سلسلة التفاعل:** {user['streak_days']} يوم\n"
        f"🏷️ **إجمالي التاغات:** {total}\n"
        f"🏅 **الشارات:** {badges_str}"
    )
    
    await update.message.reply_text(text, parse_mode='Markdown')

async def show_leaderboard(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Displays top 10 users."""
    with get_db_connection() as conn:
        c = conn.cursor()
        c.execute("SELECT nickname, xp FROM users ORDER BY xp DESC LIMIT 10")
        rows = c.fetchall()
    
    if not rows:
        await update.message.reply_text("📭 لا يوجد بيانات كافية.")
        return

    text = "🏆 **لوحة المتصدرين (Top 10)**\n\n"
    for i, row in enumerate(rows, 1):
        medal = "🥇" if i==1 else "🥈" if i==2 else "🥉" if i==3 else f"{i}."
        text += f"{medal} **{row['nickname']}** — {row['xp']} XP\n"
        
    await update.message.reply_text(text, parse_mode='Markdown')

async def show_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Help message."""
    text = (
        "ℹ️ **المساعدة - TactaBot**\n\n"
        "🎮 **كيف تلعب؟**\n"
        "1. اضغط 'بدء التاغينغ'.\n"
        "2. شاهد الفيديو.\n"
        "3. اختر الحدث الصحيح.\n\n"
        "⭐ **النقاط:**\n"
        "+1 XP للمشاركة\n"
        "+5 XP للإجابة الصحيحة\n"
        "+20 XP بونص يومي (10 تاغات)\n\n"
        "⚠️ التصويت العشوائي يقلل من نقاط ثقتك!"
    )
    await update.message.reply_text(text, parse_mode='Markdown')

# --- MAIN EXECUTION ---

if __name__ == '__main__':
    # 1. Validation
    if not TOKEN:
        print("❌ Error: TELEGRAM_BOT_TOKEN is missing in .env file.")
        exit(1)
        
    if not ADMIN_IDS:
        print("⚠️ Warning: ADMIN_IDS not set. Admin features will be hidden.")

    # 2. Initialization
    init_db()
    
    # 3. Application Builder
    app = ApplicationBuilder().token(TOKEN).build()
    
    # 4. Handler Registration
    # Commands
    app.add_handler(CommandHandler('start', start))
    app.add_handler(CommandHandler('scan', scan_local_files))
    app.add_handler(CommandHandler('help', show_help))
    
    # Admin Uploads (Video/Document)
    app.add_handler(MessageHandler(filters.VIDEO | filters.Document.VIDEO, handle_video_upload))
    
    # Callbacks (Inline Buttons)
    app.add_handler(CallbackQueryHandler(button_handler))
    
    # Text Messages (Menu & Registration)
    app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), message_handler))
    
    # 5. Run
    print(f"🚀 TactaBot is running... (Admin IDs: {len(ADMIN_IDS)})")
    app.run_polling()