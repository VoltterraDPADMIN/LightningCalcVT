const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs   = require('fs');

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
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Actualizare disponibilă',
    message: `Versiunea ${info.version} este disponibilă.\nDoriți să o descărcați acum?`,
    buttons: ['Descarcă', 'Mai târziu'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response === 0) {
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
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.setProgressBar(-1);
    mainWindow.setTitle('LightningCalcVT — Calculator Paratrăsnet');
  }
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Actualizare gata',
    message: 'Actualizarea a fost descărcată.\nAplicația se va reporni pentru a instala noua versiune.',
    buttons: ['Repornește acum', 'Mai târziu'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

// ──────────────────────────────────────────────

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
