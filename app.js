// Eurocode 5 Wood Connection Calculator
// Application data and calculation engine

const appData = {
  "wood_properties": {
    "C14": {"fm_k": 14, "ft_0_k": 8, "fc_0_k": 16, "fv_k": 1.7, "rho_k": 290, "rho_mean": 350},
    "C16": {"fm_k": 16, "ft_0_k": 10, "fc_0_k": 17, "fv_k": 1.8, "rho_k": 310, "rho_mean": 370},
    "C18": {"fm_k": 18, "ft_0_k": 11, "fc_0_k": 18, "fv_k": 2.0, "rho_k": 320, "rho_mean": 380},
    "C22": {"fm_k": 22, "ft_0_k": 13, "fc_0_k": 20, "fv_k": 2.4, "rho_k": 340, "rho_mean": 410},
    "C24": {"fm_k": 24, "ft_0_k": 14, "fc_0_k": 21, "fv_k": 2.5, "rho_k": 350, "rho_mean": 420},
    "C27": {"fm_k": 27, "ft_0_k": 16, "fc_0_k": 22, "fv_k": 2.8, "rho_k": 360, "rho_mean": 430},
    "GL20": {"fm_k": 20, "ft_0_k": 16, "fc_0_k": 20, "fv_k": 3.5, "rho_k": 340, "rho_mean": 370},
    "GL22": {"fm_k": 22, "ft_0_k": 17.6, "fc_0_k": 22, "fv_k": 3.5, "rho_k": 370, "rho_mean": 410},
    "GL24": {"fm_k": 24, "ft_0_k": 19.2, "fc_0_k": 24, "fv_k": 3.5, "rho_k": 385, "rho_mean": 420},
    "GL24h": {"fm_k": 24, "ft_0_k": 19.2, "fc_0_k": 24, "fv_k": 3.5, "rho_k": 380, "rho_mean": 420}
  },
  "bolt_properties": {
    "4.6": {"fyb": 240, "fub": 400, "alpha_v": 0.6},
    "4.8": {"fyb": 320, "fub": 400, "alpha_v": 0.5},
    "5.6": {"fyb": 300, "fub": 500, "alpha_v": 0.6},
    "5.8": {"fyb": 400, "fub": 500, "alpha_v": 0.5},
    "6.8": {"fyb": 480, "fub": 600, "alpha_v": 0.6},
    "8.8": {"fyb": 640, "fub": 800, "alpha_v": 0.6},
    "10.9": {"fyb": 900, "fub": 1000, "alpha_v": 0.5}
  },
  "kmod_values": {
    "1": {"permanent": 0.6, "long_term": 0.7, "medium_term": 0.8, "short_term": 0.9, "instantaneous": 1.1},
    "2": {"permanent": 0.6, "long_term": 0.7, "medium_term": 0.8, "short_term": 0.9, "instantaneous": 1.1},
    "3": {"permanent": 0.5, "long_term": 0.55, "medium_term": 0.65, "short_term": 0.7, "instantaneous": 0.9}
  },
  "spacing_requirements": {
    "nails": {
      "a1_min_base": 30, "a1_factor": 7,
      "a2_min_base": 15, "a2_factor": 9,
      "a3t_min_base": 45, "a3t_factor": 36,
      "a4t_min_base": 15, "a4t_factor": 9
    },
    "bolts": {
      "a1_min_base": 40, "a1_factor": 4,
      "a2_min_base": 0, "a2_factor": 3,
      "a3t_min_base": 80, "a3t_factor": 7,
      "a4t_min_base": 30, "a4t_factor": 3
    },
    "screws": {
      "a1_min_base": 20, "a1_factor": 4,
      "a2_min_base": 0, "a2_factor": 3,
      "a3t_min_base": 40, "a3t_factor": 7,
      "a4t_min_base": 15, "a4t_factor": 3
    }
  }
};

// Application state
let currentResults = {
  tirefonds: { capacity: 0, utilization: 0, compliance: true },
  nails: { capacity: 0, utilization: 0, compliance: true },
  bolts: { capacity: 0, utilization: 0, compliance: true }
};

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Calculation Functions
function getKmod() {
  const serviceClass = document.getElementById('service-class').value;
  const loadDuration = document.getElementById('load-duration').value;
  return appData.kmod_values[serviceClass][loadDuration];
}

function getWoodProperties() {
  const woodClass = document.getElementById('wood-class').value;
  return appData.wood_properties[woodClass];
}

function calculateBearingStrength(diameter, rho_k) {
  // fh,k = 0.082 * ρk * d^(-0.3) for solid wood/glulam
  return 0.082 * rho_k * Math.pow(diameter, -0.3);
}

function calculateWithdrawalCapacity(diameter, rho_k) {
  // fax,k = 0.52 * d^(-0.5) * ρk^0.8
  return 0.52 * Math.pow(diameter, -0.5) * Math.pow(rho_k, 0.8);
}

function calculateLateralResistance(diameter, thickness1, thickness2, fh_k, fu_k) {
  // Simplified Johansen yield theory implementation
  const My_k = 0.3 * fu_k * Math.pow(diameter, 2.6);
  
  // Mode I (bearing in member 1)
  const mode1 = fh_k * thickness1 * diameter;
  
  // Mode II (bearing in member 2)
  const mode2 = fh_k * thickness2 * diameter;
  
  // Mode III (one plastic hinge)
  const beta = fh_k / fh_k; // Assuming same wood for both members
  const mode3a = fh_k * thickness1 * diameter * (Math.sqrt(2 + 4 * My_k / (fh_k * diameter * thickness1 * thickness1)) - 1);
  const mode3b = 2.3 * Math.sqrt(My_k * fh_k * diameter);
  const mode3 = Math.min(mode3a, mode3b);
  
  // Mode IV (two plastic hinges)
  const mode4 = 2.3 * Math.sqrt(My_k * fh_k * diameter);
  
  return Math.min(mode1, mode2, mode3, mode4);
}

function calculateTirefondsCapacity() {
  const woodProps = getWoodProperties();
  const kmod = getKmod();
  const gamma_M = 1.3;
  
  const diameter = parseFloat(document.getElementById('screw-diameter').value);
  const length = parseFloat(document.getElementById('screw-length').value);
  const fu_k = parseFloat(document.getElementById('screw-fuk').value);
  const thickness1 = parseFloat(document.getElementById('thickness-1').value);
  const thickness2 = parseFloat(document.getElementById('thickness-2').value);
  const angle1 = parseFloat(document.getElementById('angle-1').value);
  const quantity = parseInt(document.getElementById('screw-quantity').value);
  
  const rho_k = woodProps.rho_k;
  
  // Update display values
  document.getElementById('kmod-value').textContent = kmod.toFixed(2);
  document.getElementById('rhok-value').textContent = rho_k;
  
  // Bearing strength
  const fh_k = calculateBearingStrength(diameter, rho_k);
  const fh_d = (kmod * fh_k) / gamma_M;
  
  document.getElementById('fhk-value').textContent = fh_k.toFixed(2);
  document.getElementById('fhd-value').textContent = fh_d.toFixed(2);
  
  // Withdrawal capacity
  const fax_k = calculateWithdrawalCapacity(diameter, rho_k);
  const penetration = length - thickness1;
  const Fax_Rd = (kmod * fax_k * Math.PI * diameter * penetration) / gamma_M;
  
  document.getElementById('faxk-value').textContent = fax_k.toFixed(2);
  document.getElementById('faxrd-value').textContent = Math.round(Fax_Rd);
  
  // Lateral resistance
  const Fv_Rk = calculateLateralResistance(diameter, thickness1, thickness2, fh_k, fu_k);
  const Fv_Rd = (kmod * Fv_Rk) / gamma_M;
  
  document.getElementById('fvrd-value').textContent = Math.round(Fv_Rd);
  
  // Combined loading check
  const tension_per_screw = parseFloat(document.getElementById('elu-tension').value) / quantity;
  const shear_per_screw = parseFloat(document.getElementById('elu-shear').value) / quantity;
  
  // Rope effect for angled screws
  const rope_factor = angle1 > 0 ? 1 + 0.35 * Math.sin(angle1 * Math.PI / 180) : 1;
  const Fax_Rd_effective = Fax_Rd * rope_factor;
  
  // Combined loading utilization
  const utilization = Math.sqrt(
    Math.pow(tension_per_screw / Fax_Rd_effective, 2) + 
    Math.pow(shear_per_screw / Fv_Rd, 2)
  ) * 100;
  
  document.getElementById('utilization-value').textContent = utilization.toFixed(1);
  
  // Compliance check
  const isCompliant = utilization <= 100;
  const statusElement = document.getElementById('compliance-status');
  
  if (isCompliant) {
    statusElement.textContent = 'CONFORME';
    statusElement.className = 'status status--success';
  } else {
    statusElement.textContent = 'NON CONFORME';
    statusElement.className = 'status status--error';
  }
  
  // Update global results
  currentResults.tirefonds = {
    capacity: Fv_Rd * quantity,
    utilization: utilization,
    compliance: isCompliant
  };
  
  return {
    capacity: Fv_Rd * quantity,
    utilization: utilization,
    compliance: isCompliant
  };
}

function calculateNailsCapacity() {
  const woodProps = getWoodProperties();
  const kmod = getKmod();
  const gamma_M = 1.3;
  
  const diameter = parseFloat(document.getElementById('nail-diameter').value);
  const length = parseFloat(document.getElementById('nail-length').value);
  const quantity = parseInt(document.getElementById('nail-quantity').value);
  const thickness1 = parseFloat(document.getElementById('thickness-1').value);
  const thickness2 = parseFloat(document.getElementById('thickness-2').value);
  
  // Penetration check
  const penetration = length - thickness1;
  const min_penetration = 8 * diameter;
  
  document.getElementById('nail-penetration').textContent = penetration.toFixed(1);
  document.getElementById('nail-min-penetration').textContent = min_penetration.toFixed(1);
  
  // Lateral resistance for nails
  const rho_k = woodProps.rho_k;
  const fh_k = calculateBearingStrength(diameter, rho_k);
  
  // Simplified nail resistance (Mode I)
  const Fv_Rk = fh_k * thickness1 * diameter * 0.8; // Factor for nails
  const Fv_Rd = (kmod * Fv_Rk) / gamma_M;
  
  document.getElementById('nail-fvrd').textContent = Math.round(Fv_Rd);
  
  const total_capacity = Fv_Rd * quantity;
  document.getElementById('nail-total-capacity').textContent = Math.round(total_capacity);
  
  // Applied force check
  const applied_shear = parseFloat(document.getElementById('elu-shear').value);
  const utilization = (applied_shear / total_capacity) * 100;
  const isCompliant = utilization <= 100 && penetration >= min_penetration;
  
  const statusElement = document.getElementById('nail-compliance');
  if (isCompliant) {
    statusElement.textContent = 'CONFORME';
    statusElement.className = 'status status--success';
  } else {
    statusElement.textContent = 'NON CONFORME';
    statusElement.className = 'status status--error';
  }
  
  currentResults.nails = {
    capacity: total_capacity,
    utilization: utilization,
    compliance: isCompliant
  };
  
  return {
    capacity: total_capacity,
    utilization: utilization,
    compliance: isCompliant
  };
}

function calculateBoltsCapacity() {
  const woodProps = getWoodProperties();
  const kmod = getKmod();
  const gamma_M = 1.3;
  
  const diameter = parseFloat(document.getElementById('bolt-diameter').value);
  const boltClass = document.getElementById('bolt-class').value;
  const quantity = parseInt(document.getElementById('bolt-quantity').value);
  const thickness1 = parseFloat(document.getElementById('thickness-1').value);
  const thickness2 = parseFloat(document.getElementById('thickness-2').value);
  
  const boltProps = appData.bolt_properties[boltClass];
  const rho_k = woodProps.rho_k;
  
  // Bearing strength for bolts
  const fh_k = 0.082 * (1 - 0.01 * diameter) * rho_k;
  document.getElementById('bolt-fhk').textContent = fh_k.toFixed(2);
  
  // Bolt resistance
  const My_k = 0.3 * boltProps.fub * Math.pow(diameter, 2.6);
  const Fv_Rk = calculateLateralResistance(diameter, thickness1, thickness2, fh_k, boltProps.fub);
  const Fv_Rd = (kmod * Fv_Rk) / gamma_M;
  
  document.getElementById('bolt-fvrd').textContent = Math.round(Fv_Rd);
  
  const total_capacity = Fv_Rd * quantity;
  document.getElementById('bolt-total-capacity').textContent = Math.round(total_capacity);
  
  // Applied force check
  const applied_shear = parseFloat(document.getElementById('elu-shear').value);
  const utilization = (applied_shear / total_capacity) * 100;
  const isCompliant = utilization <= 100;
  
  const statusElement = document.getElementById('bolt-compliance');
  if (isCompliant) {
    statusElement.textContent = 'CONFORME';
    statusElement.className = 'status status--success';
  } else {
    statusElement.textContent = 'NON CONFORME';
    statusElement.className = 'status status--error';
  }
  
  currentResults.bolts = {
    capacity: total_capacity,
    utilization: utilization,
    compliance: isCompliant
  };
  
  return {
    capacity: total_capacity,
    utilization: utilization,
    compliance: isCompliant
  };
}

function updateSummaryTable() {
  const tbody = document.getElementById('summary-table-body');
  const appliedForce = parseFloat(document.getElementById('elu-shear').value);
  
  tbody.innerHTML = `
    <tr>
      <td>Tirefonds/Screws</td>
      <td>${Math.round(currentResults.tirefonds.capacity)}</td>
      <td>${appliedForce}</td>
      <td>${currentResults.tirefonds.utilization.toFixed(1)}%</td>
      <td><span class="status ${currentResults.tirefonds.compliance ? 'status--success' : 'status--error'}">
        ${currentResults.tirefonds.compliance ? 'CONFORME' : 'NON CONFORME'}
      </span></td>
    </tr>
    <tr>
      <td>Nails</td>
      <td>${Math.round(currentResults.nails.capacity)}</td>
      <td>${appliedForce}</td>
      <td>${currentResults.nails.utilization.toFixed(1)}%</td>
      <td><span class="status ${currentResults.nails.compliance ? 'status--success' : 'status--error'}">
        ${currentResults.nails.compliance ? 'CONFORME' : 'NON CONFORME'}
      </span></td>
    </tr>
    <tr>
      <td>Bolts</td>
      <td>${Math.round(currentResults.bolts.capacity)}</td>
      <td>${appliedForce}</td>
      <td>${currentResults.bolts.utilization.toFixed(1)}%</td>
      <td><span class="status ${currentResults.bolts.compliance ? 'status--success' : 'status--error'}">
        ${currentResults.bolts.compliance ? 'CONFORME' : 'NON CONFORME'}
      </span></td>
    </tr>
  `;
}

// Tab switching functionality
function switchTab(tabName) {
  // Hide all tab contents
  tabContents.forEach(content => {
    content.classList.remove('active');
  });
  
  // Remove active class from all tab buttons
  tabButtons.forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab content
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  // Add active class to clicked button
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  // Update summary if switching to summary tab
  if (tabName === 'summary') {
    updateSummaryTable();
  }
}

// Project management functions
function saveProject() {
  const projectData = {
    wood: {
      class: document.getElementById('wood-class').value,
      serviceClass: document.getElementById('service-class').value,
      duration: document.getElementById('load-duration').value,
      thickness1: document.getElementById('thickness-1').value,
      thickness2: document.getElementById('thickness-2').value
    },
    tirefonds: {
      diameter: document.getElementById('screw-diameter').value,
      length: document.getElementById('screw-length').value,
      fuk: document.getElementById('screw-fuk').value,
      angle1: document.getElementById('angle-1').value,
      angle2: document.getElementById('angle-2').value,
      quantity: document.getElementById('screw-quantity').value
    },
    nails: {
      diameter: document.getElementById('nail-diameter').value,
      length: document.getElementById('nail-length').value,
      type: document.getElementById('nail-type').value,
      quantity: document.getElementById('nail-quantity').value
    },
    bolts: {
      diameter: document.getElementById('bolt-diameter').value,
      class: document.getElementById('bolt-class').value,
      quantity: document.getElementById('bolt-quantity').value,
      washerSize: document.getElementById('washer-size').value
    },
    forces: {
      elsTension: document.getElementById('els-tension').value,
      elsShear: document.getElementById('els-shear').value,
      eluTension: document.getElementById('elu-tension').value,
      eluShear: document.getElementById('elu-shear').value
    }
  };
  
  // Simulate localStorage with JSON download
  const dataStr = JSON.stringify(projectData, null, 2);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'eurocode5_project.json';
  link.click();
  URL.revokeObjectURL(url);
  
  alert('Project saved successfully!');
}

function loadProject() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const projectData = JSON.parse(e.target.result);
          
          // Load wood properties
          document.getElementById('wood-class').value = projectData.wood.class;
          document.getElementById('service-class').value = projectData.wood.serviceClass;
          document.getElementById('load-duration').value = projectData.wood.duration;
          document.getElementById('thickness-1').value = projectData.wood.thickness1;
          document.getElementById('thickness-2').value = projectData.wood.thickness2;
          
          // Load tirefonds
          document.getElementById('screw-diameter').value = projectData.tirefonds.diameter;
          document.getElementById('screw-length').value = projectData.tirefonds.length;
          document.getElementById('screw-fuk').value = projectData.tirefonds.fuk;
          document.getElementById('angle-1').value = projectData.tirefonds.angle1;
          document.getElementById('angle-2').value = projectData.tirefonds.angle2;
          document.getElementById('screw-quantity').value = projectData.tirefonds.quantity;
          
          // Load nails
          document.getElementById('nail-diameter').value = projectData.nails.diameter;
          document.getElementById('nail-length').value = projectData.nails.length;
          document.getElementById('nail-type').value = projectData.nails.type;
          document.getElementById('nail-quantity').value = projectData.nails.quantity;
          
          // Load bolts
          document.getElementById('bolt-diameter').value = projectData.bolts.diameter;
          document.getElementById('bolt-class').value = projectData.bolts.class;
          document.getElementById('bolt-quantity').value = projectData.bolts.quantity;
          document.getElementById('washer-size').value = projectData.bolts.washerSize;
          
          // Load forces
          document.getElementById('els-tension').value = projectData.forces.elsTension;
          document.getElementById('els-shear').value = projectData.forces.elsShear;
          document.getElementById('elu-tension').value = projectData.forces.eluTension;
          document.getElementById('elu-shear').value = projectData.forces.eluShear;
          
          // Recalculate all
          calculateAll();
          
          alert('Project loaded successfully!');
        } catch (error) {
          alert('Error loading project file: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

function exportReport() {
  // Create a simplified HTML report
  const reportContent = `
    <html>
    <head>
      <title>Eurocode 5 Connection Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Eurocode 5 Wood Connection Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="section">
        <h2>Summary</h2>
        ${document.querySelector('.summary-table').innerHTML}
      </div>
      
      <div class="section">
        <h2>Input Parameters</h2>
        <p><strong>Wood Class:</strong> ${document.getElementById('wood-class').value}</p>
        <p><strong>Service Class:</strong> ${document.getElementById('service-class').value}</p>
        <p><strong>Load Duration:</strong> ${document.getElementById('load-duration').value}</p>
        <p><strong>Applied Forces (ELU):</strong> Tension: ${document.getElementById('elu-tension').value}N, Shear: ${document.getElementById('elu-shear').value}N</p>
      </div>
    </body>
    </html>
  `;
  
  const reportBlob = new Blob([reportContent], {type: 'text/html'});
  const url = URL.createObjectURL(reportBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'eurocode5_report.html';
  link.click();
  URL.revokeObjectURL(url);
}

function calculateAll() {
  calculateTirefondsCapacity();
  calculateNailsCapacity();
  calculateBoltsCapacity();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
  
  // Input change listeners for real-time calculation
  const inputs = document.querySelectorAll('input, select');
  inputs.forEach(input => {
    input.addEventListener('change', calculateAll);
    input.addEventListener('input', calculateAll);
  });
  
  // Project management buttons
  document.getElementById('save-project').addEventListener('click', saveProject);
  document.getElementById('load-project').addEventListener('click', loadProject);
  document.getElementById('export-report').addEventListener('click', exportReport);
  
  // Initial calculations
  calculateAll();
});

// Input validation
function validateInputs() {
  const inputs = document.querySelectorAll('input[type="number"]');
  let isValid = true;
  
  inputs.forEach(input => {
    const value = parseFloat(input.value);
    const min = parseFloat(input.getAttribute('min')) || 0;
    const max = parseFloat(input.getAttribute('max')) || Infinity;
    
    if (isNaN(value) || value < min || value > max) {
      input.classList.add('error');
      isValid = false;
    } else {
      input.classList.remove('error');
    }
  });
  
  return isValid;
}