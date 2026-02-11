
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Path to your HTML file
        // Assuming this script is in 'scripts/' and 'the ask.html' is in the root
        const htmlPath = path.join(__dirname, '..', 'the ask.html');
        const fileUrl = `file://${htmlPath}`;

        console.log(`Loading: ${fileUrl}`);
        await page.goto(fileUrl, { waitUntil: 'networkidle0' });

        // Force visibility of all fade-in elements and fix gallery layout for PDF
        console.log('Injecting CSS to force visibility and fix layout...');
        await page.addStyleTag({
            content: `
        .fade-in {
          opacity: 1 !important;
          transform: none !important;
        }
        
        /* Change horizontal scroll to grid layout for PDF */
        .gallery-scroller {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 20px !important;
          overflow: visible !important;
          padding: 0 !important;
        }
        
        /* Ensure images fit nicely */
        .gallery-item {
            width: 100% !important;
            margin-bottom: 20px !important;
            page-break-inside: avoid !important; /* Prevent cutting images across pages */
        }
        
        .gallery-img {
            width: 100% !important;
            height: auto !important;
            max-height: 250px !important;
            object-fit: cover !important; 
        }

        /* Adjust caption styling */
        .gallery-caption {
            font-size: 0.8rem !important;
            margin-top: 5px !important;
        }
      `
        });

        // Set viewport to ensure responsiveness is handled (optional but good practice)
        await page.setViewport({ width: 1200, height: 800 });

        const pdfPath = path.join(__dirname, '..', 'public', 'the ask.pdf');

        console.log('Generating PDF...');
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                bottom: '20px',
                left: '20px',
                right: '20px'
            }
        });

        console.log(`PDF generated successfully at: ${pdfPath}`);

        await browser.close();
    } catch (error) {
        console.error('Error generating PDF:', error);
        process.exit(1);
    }
})();
