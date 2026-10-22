# AI Receptionist SaaS 🤖

An enterprise-ready, AI-powered automated receptionist platform designed to handle multi-channel customer inquiries, automate ticket resolution, and facilitate seamless bot interactions across Discord, web widgets, and internal communication workflows.

---

## 🌟 Key Features

- **Automated Conversational AI**: Powered by modern Large Language Models (LLMs) to deliver contextual and accurate responses in real time.
- **Discord Bot Integration**: Full integration with the Discord API to serve as an intelligent server receptionist and user support assistant.
- **Custom Knowledge Base**: Ingest custom business FAQs, operational rules, and guidelines for customized support outputs.
- **Multi-Tenant Dashboard**: Modern web console for managing bot instances, configuring system prompts, and reviewing analytical metrics.
- **Serverless Architecture**: Designed for quick deployment and high scalability with zero-downtime hosting.

---

## 🛠️ Tech Stack

- **Frontend & Dashboard**: [Next.js](https://nextjs.org/) (React), [Tailwind CSS](https://tailwindcss.com/)
- **Backend / Bot Framework**: Node.js, [discord.js](https://discord.js.org/)
- **AI Integrations**: OpenAI API / Custom LLM Gateways
- **Deployment & Hosting**: Vercel, GitHub Actions, GitHub Pages

---

## 📂 Project Structure

```text
ai-receptionist-saas/
├── .github/              # GitHub Actions & workflow configurations
├── public/               # Static assets & web resources
├── src/                  # Application source code
│   ├── components/       # Reusable UI components
│   ├── pages/            # Next.js routing and API endpoints
│   ├── bot/              # Discord bot client & event handlers
│   └── lib/              # Utility functions & API clients
├── privacy.html          # Public Privacy Policy document
├── terms.html            # Public Terms of Service document
├── README.md             # Project documentation
└── package.json          # Node.js dependencies and scripts
🚀 Quick Start
Prerequisites
Make sure you have the following installed on your local environment:

Node.js (v18.0.0 or higher)

npm or pnpm

Git

1. Clone the Repository
Bash
git clone [https://github.com/danielenglish19960118/ai-receptionist-saas.git](https://github.com/danielenglish19960118/ai-receptionist-saas.git)
cd ai-receptionist-saas
2. Install Dependencies
Bash
npm install
3. Configure Environment Variables
Create a .env.local file in the root directory:

Code snippet
# Discord Configuration
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_BOT_TOKEN=your_discord_bot_token

# AI / LLM Keys
OPENAI_API_KEY=your_openai_api_key

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
4. Run Development Server
Bash
npm run dev
Visit http://localhost:3000 in your browser to access the management interface.

⚖️ Compliance & Legal Documents
For platform verification (e.g., Discord Developer Portal verification, OAuth2 compliance) and user transparency:

📜 Terms of Service: https://danielenglish19960118.github.io/ai-receptionist-saas/terms.html

🔒 Privacy Policy: https://danielenglish19960118.github.io/ai-receptionist-saas/privacy.html

🚢 Deployment
Deploying Legal Pages via GitHub Pages
Navigate to your repository settings on GitHub:

https://github.com/danielenglish19960118/ai-receptionist-saas/settings

Select Pages from the left navigation menu.

Under Build and deployment > Source, choose Deploy from a branch.

Set the branch to main / / (root) and click Save.

Deploying Web App via Vercel
Bash
npm run build
Link your GitHub repository directly to Vercel for automated CI/CD deployments on every push to the main branch.

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
