# Eternal Stone Industries

## Prerequisites

- **Node.js** v16 or higher
- **npm** v8 or higher
- **Python** ≥ 3.9

Check your setup:

```bash
node -v
npm -v
python --version
```

## Instalation

```bash
git clone https://github.com/TraumeVonHeidelberg/Eternal-Stone
cd Eternal-Stone
npm install
npm --prefix frontend install
npm --prefix api-node install
python -m venv backend-py/venv
backend-py\venv\Scripts\Activate.ps1
pip install -r backend-py/requirements.txt
```

## Development

```bash
npm run dev
```

Access at: http://localhost:5173

## Production Build (FrontEnd)

```bash
npm --prefix frontend run build
```

Built files are located in the dist/ directory.

## Description

**Anicole** is a service that allows users to watch anime online and play exciting games related to the main theme.
In the current version, users can browse new and popular anime or search for a specific title.
The games section currently includes only the Monkeytype game, which fully meets the requirements of the final project.
I'm planning to expand this app futher in the future adding new options like login, saving episodes, AI subtitles
translation and improving it's design.
App logo and header animation were made by me.
