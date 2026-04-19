const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs   = require('fs');

let mainWindow    = null;
let updateWindow  = null;
let changelogWin  = null;

// ──────────────────────────────────────────────
// Changelog hardcodat pe versiuni
// ──────────────────────────────────────────────
const CHANGELOG = {
  '1.0.2': [
    'Hartă animată a Rețelei Electrice de Transport (SEN) pe ecranul principal',
    'Linii de interconexiune internaționale: Ucraina, Moldova, Bulgaria, Serbia, Ungaria',
    'Granița României corectată geografic (Moldova Nouă, Beba Veche, Herța)',
    'Zoom hartă mărit — acoperă întreaga fereastră a aplicației',
    'Zona de protecție afișată în galben (conform normativului)',
    'Fereastră pop-up cu progres descărcare actualizări și changelog',
    'Raport PDF tipărit corect (fix @media print)',
  ],
  '1.0.3': [
    'Pop-up progres descărcare actualizare cu viteză și procent',
    'Pop-up changelog după repornire — fără reinstalare',
    'Actualizările nu mai cer parolă (instalare silențioasă)',
    'Raport PDF tipărit corect — pagina nu mai iese goală',
    'Indicator de progres la generarea raportului PDF',
  ],
  '1.0.4': [
    'Figuri Cap. 6 afișate corect una lângă alta la tipărire',
    'Sistem de actualizare silențioasă complet funcțional',
    'Pop-up changelog afișat automat după actualizare',
    'Stabilitate îmbunătățită la descărcarea actualizărilor',
  ],
};

// ──────────────────────────────────────────────
// Versiune anterioară — pentru popup post-update
// ──────────────────────────────────────────────
function getLastVersion() {
  try {
    const f = path.join(app.getPath('userData'), 'last-version.json');
    return JSON.parse(fs.readFileSync(f, 'utf8')).version || null;
  } catch { return null; }
}
function saveCurrentVersion() {
  try {
    const f = path.join(app.getPath('userData'), 'last-version.json');
    fs.writeFileSync(f, JSON.stringify({ version: app.getVersion() }), 'utf8');
  } catch { /* ignoră */ }
}

function getChangelogNotes(version) {
  return CHANGELOG[version] || [`Versiunea ${version} instalată cu succes.`];
}

// ──────────────────────────────────────────────
// Fereastra de progres descărcare
// ──────────────────────────────────────────────
function openUpdateWindow(oldVersion, newVersion, releaseNotes) {
  if (updateWindow && !updateWindow.isDestroyed()) { updateWindow.focus(); return; }

  updateWindow = new BrowserWindow({
    width: 480,
    height: 410,
    resizable: false,
    minimizable: false,
    maximizable: false,
    frame: false,
    alwaysOnTop: true,
    title: 'Actualizare LightningCalcVT',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    parent: mainWindow,
    modal: false,
  });

  updateWindow.loadFile(path.join(app.getAppPath(), 'update-progress.html'));

  updateWindow.webContents.on('did-finish-load', () => {
    updateWindow.webContents.executeJavaScript(
      `window.updateAPI.setVersions(${JSON.stringify(oldVersion)}, ${JSON.stringify(newVersion)})`
    );

    let notes = [];
    if (releaseNotes && typeof releaseNotes === 'string' && releaseNotes.trim()) {
      // GitHub returnează release notes ca HTML — extragem textul din <li>
      const liItems = releaseNotes.match(/<li>(.*?)<\/li>/gi);
      if (liItems && liItems.length > 0) {
        notes = liItems.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(l => l.length > 2);
      } else {
        // Fallback: markdown plain text
        notes = releaseNotes.split('\n')
          .map(l => l.replace(/^[-*•#]\s*/, '').replace(/<[^>]+>/g, '').trim())
          .filter(l => l.length > 4);
      }
    }
    if (notes.length === 0) notes = getChangelogNotes(newVersion);

    updateWindow.webContents.executeJavaScript(
      `window.updateAPI.setChangelog(${JSON.stringify(notes)})`
    );
  });

  updateWindow.on('closed', () => { updateWindow = null; });
}

// ──────────────────────────────────────────────
// Popup changelog post-actualizare
// ──────────────────────────────────────────────
function openChangelogPopup(oldVersion, newVersion) {
  if (changelogWin && !changelogWin.isDestroyed()) { changelogWin.focus(); return; }

  changelogWin = new BrowserWindow({
    width: 460,
    height: 420,
    resizable: false,
    minimizable: false,
    maximizable: false,
    frame: false,
    alwaysOnTop: true,
    title: 'Noutăți LightningCalcVT',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    parent: mainWindow,
    modal: false,
  });

  changelogWin.loadFile(path.join(app.getAppPath(), 'changelog-popup.html'));

  changelogWin.webContents.on('did-finish-load', () => {
    changelogWin.webContents.send('changelog-data', {
      oldVersion,
      newVersion,
      notes: getChangelogNotes(newVersion),
    });
  });

  changelogWin.on('closed', () => { changelogWin = null; });
}

// ──────────────────────────────────────────────
// Fereastra principală
// ──────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'LightningCalcVT — Calculator Paratrăsnet',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Verifică dacă tocmai s-a instalat o versiune nouă
    const lastVersion = getLastVersion();
    const currentVersion = app.getVersion();
    saveCurrentVersion();

    if (lastVersion && lastVersion !== currentVersion) {
      // Tocmai s-a actualizat — arată changelog după 1 secundă
      setTimeout(() => openChangelogPopup(lastVersion, currentVersion), 1000);
    } else {
      // Verifică actualizări disponibile după 3 secunde
      setTimeout(() => checkForUpdates(), 3000);
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  const menuTemplate = [
    {
      label: 'Aplicație',
      submenu: [
        { label: 'Minimizează', role: 'minimize' },
        { type: 'separator' },
        { label: 'Verifică actualizări', click: () => checkForUpdates(true) },
        { type: 'separator' },
        { label: 'Ieșire', role: 'quit' }
      ]
    },
    {
      label: 'Vizualizare',
      submenu: [
        { label: 'Zoom In',  role: 'zoomIn'  },
        { label: 'Zoom Out', role: 'zoomOut' },
        { label: 'Resetează zoom', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Ecran complet', role: 'togglefullscreen' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

// ──────────────────────────────────────────────
// IPC — PNG-uri normativ
// ──────────────────────────────────────────────
ipcMain.on('get-app-version', (event) => {
  event.returnValue = app.getVersion();
});

ipcMain.on('get-normativ-images', (event) => {
  const candidates = [
    path.dirname(app.getPath('exe')),
    __dirname,
    process.cwd(),
  ];
  const files  = {
    a86: 'Figura A.8.6 - Normativ.png',
    a87: 'Figura A.8.7.png',
  };
  const result = { a86: null, a87: null };
  for (const [key, filename] of Object.entries(files)) {
    for (const dir of candidates) {
      const filePath = path.join(dir, filename);
      try {
        const data = fs.readFileSync(filePath);
        result[key] = 'data:image/png;base64,' + data.toString('base64');
        break;
      } catch { /* încearcă următoarea locație */ }
    }
  }
  event.returnValue = result;
});

// Butonul "Repornește și instalează"
ipcMain.on('install-update', () => {
  // Închidem toate ferestrele înainte să pornim installer-ul
  if (updateWindow  && !updateWindow.isDestroyed())  updateWindow.close();
  if (changelogWin  && !changelogWin.isDestroyed())  changelogWin.close();
  if (mainWindow    && !mainWindow.isDestroyed())    mainWindow.hide();
  // Mic delay ca procesele să se elibereze, apoi instalare silențioasă
  setTimeout(() => autoUpdater.quitAndInstall(true, true), 800);
});

// ──────────────────────────────────────────────
// Auto-updater
// ──────────────────────────────────────────────
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let isManualCheck = false;

function checkForUpdates(manual = false) {
  isManualCheck = manual;
  autoUpdater.checkForUpdates().catch(() => {
    if (manual) {
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Verificare actualizări',
        message: 'Nu s-a putut verifica.',
        detail: 'Verificați conexiunea la internet și încercați din nou.',
        buttons: ['OK'],
      });
    }
  });
}

autoUpdater.on('update-available', (info) => {
  const currentVersion = app.getVersion();
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Actualizare disponibilă',
    message: `Versiunea ${info.version} este disponibilă.`,
    detail: `Versiunea curentă: ${currentVersion}\n\nDoriți să descărcați și să instalați actualizarea?`,
    buttons: ['Descarcă acum', 'Mai târziu'],
    defaultId: 0,
    icon: path.join(__dirname, 'build', 'icon.ico'),
  }).then(({ response }) => {
    if (response === 0) {
      openUpdateWindow(currentVersion, info.version, info.releaseNotes);
      autoUpdater.downloadUpdate();
    }
  });
});

autoUpdater.on('update-not-available', () => {
  if (isManualCheck) {
    isManualCheck = false;
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Nicio actualizare disponibilă',
      message: 'Aplicația este la zi.',
      detail: `Versiunea instalată (${app.getVersion()}) este cea mai recentă.`,
      buttons: ['OK'],
    });
  }
});

autoUpdater.on('download-progress', (progress) => {
  const percent = Math.round(progress.percent);
  if (mainWindow) {
    mainWindow.setProgressBar(progress.percent / 100);
    mainWindow.setTitle(`LightningCalcVT — Descărcare ${percent}%`);
  }
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.webContents.executeJavaScript(
      `window.updateAPI.setProgress(${progress.percent}, ${progress.bytesPerSecond}, ${progress.transferred}, ${progress.total})`
    ).catch(() => {});
  }
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.setProgressBar(-1);
    mainWindow.setTitle('LightningCalcVT — Calculator Paratrăsnet');
  }
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.webContents.executeJavaScript(`window.updateAPI.setDone()`).catch(() => {});
  }
});

// ──────────────────────────────────────────────
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (!mainWindow) createWindow(); });
