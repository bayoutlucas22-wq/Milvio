const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8888;
const ARTIFACTS_DIR = path.join(__dirname, '../artifacts');

app.use(express.static(path.join(__dirname, 'public')));

// Helper to list json files recursively
function getJsonFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getJsonFiles(filePath, fileList);
    } else if (filePath.endsWith('.json')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

app.get('/api/artifacts', (req, res) => {
  try {
    const allFiles = getJsonFiles(ARTIFACTS_DIR);
    // Return paths relative to ARTIFACTS_DIR
    const relativeFiles = allFiles
      .map(f => path.relative(ARTIFACTS_DIR, f))
      .filter(f => f.includes('raw/Relatorio-Comissoes-Semana'));
    res.json(relativeFiles);
  } catch (error) {
    console.error('Error reading artifacts directory:', error);
    res.status(500).json({ error: 'Failed to read artifacts' });
  }
});

app.get('/api/artifacts/content', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: 'Path is required' });
  }

  const absolutePath = path.join(ARTIFACTS_DIR, filePath);
  
  // Basic security check to prevent directory traversal
  if (!absolutePath.startsWith(ARTIFACTS_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const content = fs.readFileSync(absolutePath, 'utf8');
    res.json(JSON.parse(content));
  } catch (error) {
    console.error('Error reading artifact file:', error);
    res.status(500).json({ error: 'Failed to read artifact file' });
  }
});

app.listen(PORT, () => {
  console.log(`Artifact viewer running at http://localhost:${PORT}`);
});
