import ngrok from 'ngrok';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 8080;

async function startForwarding() {
    try {
        console.log('🧹 Disconnecting existing ngrok tunnels...');

        // هذا يمسح كل الـ tunnels المفتوحة
        await ngrok.disconnect();
        await ngrok.kill();

        console.log(`🚀 Starting ngrok tunnel for port ${PORT}...`);

        const options = {
            addr: PORT,
            proto: 'http',
            authtoken: process.env.NGROK_AUTHTOKEN, // خليه دايمًا هنا
        };

        const url = await ngrok.connect(options);

        console.log('\n=========================================');
        console.log('✅ NGROK FORWARDING ACTIVE');
        console.log(`🔗 Public URL: ${url}`);
        console.log('=========================================\n');

        console.log('Keep this process running to maintain the tunnel.');
        console.log('Press Ctrl+C to stop.');

    } catch (err) {
        console.error('❌ Error starting ngrok:', err);
        process.exit(1);
    }
}

startForwarding();
