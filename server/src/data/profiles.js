const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', '..', 'data');
const profilesPath = path.join(dataDir, 'profiles.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// In-memory cache
let profiles = {};

// Load profiles
function loadProfiles() {
  try {
    if (fs.existsSync(profilesPath)) {
      const data = fs.readFileSync(profilesPath, 'utf8');
      profiles = JSON.parse(data);
    } else {
      profiles = {};
      saveProfiles();
    }
  } catch (err) {
    console.error('Error loading profiles:', err);
    profiles = {};
  }
}

// Save profiles
function saveProfiles() {
  try {
    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
  } catch (err) {
    console.error('Error saving profiles:', err);
  }
}

function getProfile(id) {
  if (!profiles[id]) {
    profiles[id] = {
      username: 'Unknown',
      totalGames: 0,
      totalWins: 0,
      totalTags: 0,
      totalEscapes: 0,
      createdAt: Date.now()
    };
    saveProfiles();
  }
  return profiles[id];
}

function updateProfileName(id, name) {
  if (!id) return;
  const p = getProfile(id);
  p.username = name;
  saveProfiles();
}

function incrementStat(id, statName, amount = 1) {
  if (!id) return;
  const p = getProfile(id);
  if (typeof p[statName] === 'number') {
    p[statName] += amount;
    saveProfiles();
  }
}

// Initialize on require
loadProfiles();

module.exports = {
  getProfile,
  updateProfileName,
  incrementStat
};
