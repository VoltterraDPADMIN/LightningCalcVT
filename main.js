const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs   = require('fs');

let updateWindow = null;

// Changelog hardcodat pe versiuni (fallback dacă GitHub nu returnează release notes)
const CHANGELOG = {
  '1.0.2': [
    'Hartă animată a Rețelei Electrice de Transport (SEN) pe ecranul principal',
    'Linii de interconexiune internaționale: Ucraina, Moldova, Bulgaria, Serbia, Ungaria',
    'Granița României corectată geografic (Moldova Nouă, Beba Veche, Herța)',
    'Zoom hartă mărit — acoperă întreaga fereastră a aplicației',
    'Zona de protecție afișată în galben (conform normativului)',
  ],
};

function openUpdateWindow(oldVersion, newVersion, releaseNotes) {
  if (updateWindow) { updateWindow.focus(); return; }

  updateWindow = new BrowserWindow({
    width: 480,
    height: 400,
    resizable: false,
    minimizable: false,
    maximizable: false,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    title: 'Actualizare LightningCalcVT',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
    },
    parent: mainWindow,
    modal: false,
  });

  updateWindow.loadFile('update-progress.html');

  updateWindow.webContents.on('did-finish-load', () => {
    // Trimite versiunile
    updateWindow.webContents.executeJavaScript(
      `window.updateAPI.setVersions(${JSON.stringify(oldVersion)}, ${JSON.stringify(newVersion)})`
    );

    // Determină changelog: prioritate GitHub release notes, fallback hardcodat
    let notes = [];
    if (releaseNotes && typeof releaseNotes === 'string' && releaseNotes.trim()) {
      // Parsează bullet-urile din markdown release notes
      notes = releaseNotes.split('\n')
        .map(l => l.replace(/^[-*•]\s*/, '').trim())
        .filter(l => l.length > 0 && !l.startsWith('#'));
    }
    if (notes.length === 0 && CHANGELOG[newVersion]) {
      notes = CHANGELOG[newVersion];
    }
    updateWindow.webContents.executeJavaScript(
      `window.updateAPI.setChangelog(${JSON.stringify(notes)})`
    );
  });

  updateWindow.on('closed', () => { updateWindow = null; });
}

let mainWindow;

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
    // Verifică actualizări la 3 secunde după pornire (silențios)
    setTimeout(() => checkForUpdates(), 3000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuTemplate = [
    {
      label: 'Aplicație',
      submenu: [
        { label: 'Minimizează', role: 'minimize' },
        { type: 'separator' },
        {
          label: 'Verifică actualizări',
          click: () => checkForUpdates(true),
        },
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
// IPC — citire PNG-uri normativ din directorul exe-ului
// ──────────────────────────────────────────────

ipcMain.on('get-normativ-images', (event) => {
  // Căutăm PNG-urile în mai multe locații posibile:
  //   1. lângă exe (build de producție instalat)
  //   2. __dirname (folderul sursă, modul development npm start)
  //   3. process.cwd() (directorul de lucru curent)
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
        break; // găsit — trece la următorul fișier
      } catch (e) {
        // nu există în această locație — încearcă următoarea
      }
    }
  }
  event.returnValue = result;
});

// ──────────────────────────────────────────────
// Auto-updater
// ──────────────────────────────────────────────

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function checkForUpdates(manual = false) {
  autoUpdater.checkForUpdates().catch(() => {
    if (manual) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Verificare actualizări',
        message: 'Nu s-a putut verifica. Verificați conexiunea la internet.',
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

autoUpdater.on('update-not-available', (info) => {
  // Afișează mesaj doar dacă utilizatorul a apăsat manual "Verifică actualizări"
  if (info._manual) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Nicio actualizare',
      message: 'Aplicația este la zi.',
      buttons: ['OK'],
    });
  }
});

autoUpdater.on('download-progress', (progress) => {
  const percent = Math.round(progress.percent);
  if (mainWindow) {
    mainWindow.setProgressBar(progress.percent / 100);
    mainWindow.setTitle(`LightningCalcVT — Descărcare actualizare ${percent}%`);
  }
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.webContents.executeJavaScript(
      `window.updateAPI.setProgress(${progress.percent}, ${progress.bytesPerSecond}, ${progress.transferred}, ${progress.total})`
    );
  }
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.setProgressBar(-1);
    mainWindow.setTitle('LightningCalcVT — Calculator Paratrăsnet');
  }
  // Arată butonul "Repornește și instalează" în fereastra de progres
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.webContents.executeJavaScript(`window.updateAPI.setDone()`);
  }
});

// Butonul "Repornește și instalează" din fereastra de progres
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

// ──────────────────────────────────────────────

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
