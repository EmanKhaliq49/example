let map;
let userLocation = null;

// UI Elements
const aiAssistantBtn = document.getElementById('ai-assistant-btn');
const emergencyBtn = document.getElementById('emergency-btn');
const emergencySection = document.getElementById('emergency-section');
const sendLocationBtn = document.getElementById('send-location-btn');
const contactForm = document.getElementById('contact-form');
const contactEmailInput = document.getElementById('contact-email');
const contactList = document.getElementById('contact-list');
const aiModal = document.getElementById('ai-modal');
const closeAiModal = document.getElementById('close-ai-modal');
const aiInput = document.getElementById('ai-input');
const aiSend = document.getElementById('ai-send');
const aiMessages = document.getElementById('ai-messages');

// --- UI Navigation ---
aiAssistantBtn.onclick = () => {
  aiModal.classList.remove('hidden');
};
emergencyBtn.onclick = () => {
  emergencySection.classList.remove('hidden');
  emergencyBtn.disabled = true;
};
closeAiModal.onclick = () => {
  aiModal.classList.add('hidden');
};

// --- Emergency Contact Management ---
function getContacts() {
  return JSON.parse(localStorage.getItem('emergencyContacts') || '[]');
}
function saveContacts(contacts) {
  localStorage.setItem('emergencyContacts', JSON.stringify(contacts));
}
function renderContacts() {
  const contacts = getContacts();
  contactList.innerHTML = '';
  contacts.forEach((email, idx) => {
    const li = document.createElement('li');
    li.textContent = email;
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => {
      const updated = contacts.filter((_, i) => i !== idx);
      saveContacts(updated);
      renderContacts();
    };
    li.appendChild(removeBtn);
    contactList.appendChild(li);
  });
}
contactForm.onsubmit = (e) => {
  e.preventDefault();
  const email = contactEmailInput.value.trim();
  if (email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    const contacts = getContacts();
    if (!contacts.includes(email)) {
      contacts.push(email);
      saveContacts(contacts);
      renderContacts();
    }
    contactEmailInput.value = '';
  } else {
    alert('Please enter a valid email address.');
  }
};
renderContacts();

// --- Google Maps Integration ---
window.initMap = function() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 20, lng: 0 },
    zoom: 2,
  });
};

function getLocationAndSendAlert() {
  if (!navigator.geolocation) {
    alert('Geolocation not supported!');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      userLocation = { lat, lng };
      map.setCenter(userLocation);
      map.setZoom(15);
      new google.maps.Marker({
        position: userLocation,
        map: map,
        title: 'You are here',
      });
      // Get address
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyDhMsCZTDAIMllWRzYRss00-z1h1UDnWwI`;
      fetch(geocodeUrl)
        .then((response) => response.json())
        .then((data) => {
          let address = 'Unknown';
          if (data.status === 'OK' && data.results.length) {
            address = data.results[0].formatted_address;
          }
          sendToAllContacts(lat, lng, address);
        })
        .catch(() => {
          sendToAllContacts(lat, lng, 'Unknown');
        });
    },
    (error) => {
      alert('Failed to get your location.');
    }
  );
}

function sendToAllContacts(lat, lng, address) {
  const contacts = getContacts();
  if (!contacts.length) {
    alert('No emergency contacts saved!');
    return;
  }
  const formspreeEndpoint = 'https://formspree.io/f/xanbegvj';
  const message = `🚨 Emergency Alert!\n\nLatitude: ${lat}\nLongitude: ${lng}\nAddress: ${address}\n\nGoogle Maps: https://www.google.com/maps?q=${lat},${lng}`;
  Promise.all(
    contacts.map(email =>
      fetch(formspreeEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _subject: '🚨 Emergency Alert!',
          message: message,
          to: email
        })
      })
    )
  )
    .then(responses => {
      if (responses.every(r => r.ok)) {
        alert('🚨 Emergency alert sent to all contacts!');
      } else {
        alert('Some alerts failed to send.');
      }
    })
    .catch(() => {
      alert('Error sending alert.');
    });
}
sendLocationBtn.onclick = getLocationAndSendAlert;

// --- AI Assistant (Simple, Local) ---
function aiReply(input) {
  if (!userLocation) {
    return "I don't have your current location yet. Please use the emergency feature to get your location.";
  }
  const { lat, lng } = userLocation;
  input = input.toLowerCase();
  if (input.includes('where') && input.includes('am')) {
    return `You are at latitude ${lat.toFixed(5)}, longitude ${lng.toFixed(5)}. <a href='https://www.google.com/maps?q=${lat},${lng}' target='_blank'>View on Google Maps</a>.`;
  }
  if (input.includes('address')) {
    // Try to fetch address again
    return new Promise((resolve) => {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyDhMsCZTDAIMllWRzYRss00-z1h1UDnWwI`;
      fetch(geocodeUrl)
        .then((response) => response.json())
        .then((data) => {
          if (data.status === 'OK' && data.results.length) {
            resolve(`Your address is: ${data.results[0].formatted_address}`);
          } else {
            resolve('Sorry, I could not retrieve your address.');
          }
        })
        .catch(() => resolve('Sorry, I could not retrieve your address.'));
    });
  }
  return "I'm here to help you with your current location. You can ask me things like 'Where am I?' or 'What is my address?'";
}
function appendAiMessage(text, isUser) {
  const div = document.createElement('div');
  div.innerHTML = text;
  div.style.textAlign = isUser ? 'right' : 'left';
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}
aiSend.onclick = async () => {
  const input = aiInput.value.trim();
  if (!input) return;
  appendAiMessage(input, true);
  aiInput.value = '';
  const reply = await aiReply(input);
  appendAiMessage(reply, false);
};
aiInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') aiSend.click();
});