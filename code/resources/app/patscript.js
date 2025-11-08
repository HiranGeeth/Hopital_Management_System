const patientBody = document.getElementById('patient-body');
const PATIENT_COUNT = 10;
const CRITICAL_COUNT = 3;
const CRITICAL_INTERVAL = 7000;

let audioEnabled = false;
const alarmAudio = document.getElementById('alarm-sound');

function startSystem() {
  // Play audio once to unlock autoplay
  //alarmAudio.play().catch(e => console.log('Audio blocked:', e));
  //audioEnabled = true;

  // Hide the button
  document.getElementById('start-btn').style.display = 'none';

  // Start system
  graduallyForceCriticals();
  renderTable();
  setInterval(updateVitals, 2000);
}

// Utility
function randomBetween(min, max) {
  return +(Math.random() * (max - min) + min).toFixed(1);
}

// Patient initialization
let patients = [];
for (let i = 1; i <= PATIENT_COUNT; i++) {
  patients.push({
    bed: i,
    spo2: randomBetween(95, 100),
    bpSys: randomBetween(110, 130),
    bpDia: randomBetween(70, 85),
    temp: randomBetween(36.1, 37.2),
    hr: randomBetween(60, 100),
    isCriticalForced: false,
    forcedCriticalVitals: [],
    criticalCells: [],
    justPromoted: false
  });
}

// Gradually force patients critical
function graduallyForceCriticals() {
  let forcedCount = 0;
  const indices = Array.from({ length: PATIENT_COUNT }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  function forceNext() {
    if (forcedCount < CRITICAL_COUNT) {
      const idx = indices[forcedCount];
      const p = patients[idx];
      p.isCriticalForced = true;

      const vitalKeys = ['spo2', 'bpSys', 'bpDia', 'temp', 'hr'];
      const count = Math.floor(Math.random() * 2) + 1;
      for (let i = vitalKeys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [vitalKeys[i], vitalKeys[j]] = [vitalKeys[j], vitalKeys[i]];
      }
      p.forcedCriticalVitals = vitalKeys.slice(0, count);

      forcedCount++;
      setTimeout(forceNext, CRITICAL_INTERVAL);
    }
  }

  setTimeout(forceNext, 5000);
}

function checkAndToggleAlarm() {
  const anyCritical = patients.some(p => isCritical(p));
  console.log("Any critical?", anyCritical, "Audio paused?", alarmAudio.paused);
  if (anyCritical) {
    if (alarmAudio.paused) {
      alarmAudio.play().catch(e => {
        console.log('Alarm play prevented:', e);
      });
    }
  } else {
    if (!alarmAudio.paused) {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
    }
  }
}

// Determine critical status
function isCritical(p) {
  p.criticalCells = [];
  if (p.spo2 < 90) p.criticalCells.push('spo2');
  if (p.bpSys > 160 || p.bpDia > 100 || p.bpSys < 90 || p.bpDia < 60) p.criticalCells.push('bp');
  if (p.temp > 38 || p.temp < 35) p.criticalCells.push('temp');
  if (p.hr < 50 || p.hr > 120) p.criticalCells.push('hr');
  return p.isCriticalForced || p.criticalCells.length > 0;
}

// Update vitals
function varyValue(value, min, max, maxChange = 1) {
  let change = (Math.random() * maxChange * 2) - maxChange;
  let newVal = value + change;
  if (newVal < min) newVal = min;
  if (newVal > max) newVal = max;
  return +newVal.toFixed(1);
}

function updateVitals() {
  patients.forEach(p => {
    if (p.isCriticalForced) {
      p.spo2 = p.forcedCriticalVitals.includes('spo2') ? varyValue(p.spo2, 70, 85, 0.8) : varyValue(p.spo2, 95, 100, 0.3);
      p.bpSys = p.forcedCriticalVitals.includes('bpSys') ? varyValue(p.bpSys, 170, 190, 1) : varyValue(p.bpSys, 110, 130, 1);
      p.bpDia = p.forcedCriticalVitals.includes('bpDia') ? varyValue(p.bpDia, 110, 120, 0.5) : varyValue(p.bpDia, 70, 85, 0.5);
      p.temp = p.forcedCriticalVitals.includes('temp') ? varyValue(p.temp, 39, 41, 0.3) : varyValue(p.temp, 36.1, 37.2, 0.1);
      p.hr = p.forcedCriticalVitals.includes('hr') ? varyValue(p.hr, 130, 160, 2) : varyValue(p.hr, 60, 100, 2);
    } else {
      p.spo2 = varyValue(p.spo2, 95, 100, 0.3);
      p.bpSys = varyValue(p.bpSys, 110, 130, 1);
      p.bpDia = varyValue(p.bpDia, 70, 85, 0.5);
      p.temp = varyValue(p.temp, 36.1, 37.2, 0.1);
      p.hr = varyValue(p.hr, 60, 100, 2);
    }
  });

  renderTable();
  checkAndToggleAlarm();
}

// Render with animation
function renderTable() {
  const prevOrder = patients.map(p => p.bed);

  // Sort
  patients.sort((a, b) => {
    if (a.isCriticalForced && !b.isCriticalForced) return -1;
    if (!a.isCriticalForced && b.isCriticalForced) return 1;
    if (isCritical(a) && !isCritical(b)) return -1;
    if (!isCritical(a) && isCritical(b)) return 1;
    return 0;
  });

  const newOrder = patients.map(p => p.bed);

  patients.forEach(p => {
    const oldIndex = prevOrder.indexOf(p.bed);
    const newIndex = newOrder.indexOf(p.bed);
    p.justPromoted = oldIndex > newIndex;
  });

  patientBody.innerHTML = '';

  patients.forEach(p => {
    const tr = document.createElement('tr');
    if (isCritical(p)) tr.classList.add('critical');
    if (p.justPromoted) tr.classList.add('promoted');

    tr.innerHTML = `
      <td>${p.bed}</td>
      <td class="${p.criticalCells.includes('spo2') ? 'critical-cell' : ''}">${p.spo2.toFixed(0)}</td>
      <td class="${p.criticalCells.includes('bp') ? 'critical-cell' : ''}">${p.bpSys.toFixed(0)}/${p.bpDia.toFixed(0)}</td>
      <td class="${p.criticalCells.includes('temp') ? 'critical-cell' : ''}">${p.temp.toFixed(1)}</td>
      <td class="${p.criticalCells.includes('hr') ? 'critical-cell' : ''}">${p.hr.toFixed(0)}</td>
    `;

    patientBody.appendChild(tr);

    setTimeout(() => {
      tr.classList.remove('promoted');
    }, 500);
  });
}

// REMOVE these from global scope — startSystem controls when to run now
// graduallyForceCriticals();
// renderTable();
// setInterval(updateVitals, 2000);

// Add event listener to your start button in HTML:
// document.getElementById('start-btn').addEventListener('click', startSystem);
