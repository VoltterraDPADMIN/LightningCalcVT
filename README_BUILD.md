# LightningCalcVT — Instrucțiuni build

## Cerințe (instalate o singură dată pe mașina de build)
- **Node.js** v18 sau mai nou → https://nodejs.org/en/download
- **npm** (vine automat cu Node.js)

## Pași pentru a genera installerul Windows (.exe)

1. Deschide **Command Prompt** sau **PowerShell** în folderul `LightningCalcVT`
2. Instalează dependențele (prima dată):
   ```
   npm install
   ```
3. Generează installerul:
   ```
   npm run dist
   ```
4. Găsești installerul generat în `LightningCalcVT\dist\LightningCalcVT-Setup-1.0.0.exe`

## Distribuție
- Copiază `LightningCalcVT-Setup-1.0.0.exe` pe stick USB
- Pe orice laptop Windows: dublu-click → Next → Install → gata
- Aplicația apare în Start Menu și pe Desktop cu iconița Volterra

## Actualizare calculator
- Modifică `index.html` cu noua versiune a calculatorului
- Rulează din nou `npm run dist`
- Distribuie noul `.exe`
