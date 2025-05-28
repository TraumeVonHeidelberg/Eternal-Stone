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
cd Eternal-Stone-Industries
npm install
npm --prefix frontend install
npm --prefix api-node install
python -m venv venv
venv\Scripts\activate
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
