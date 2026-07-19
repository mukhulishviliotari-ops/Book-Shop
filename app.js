function xorCipher(text, password) {
    let output="";
    for(let i=0; i<text.length; i++){
      
      
        let charCode = text.charCodeAt(i) ^ password.charCodeAt(i % password.lenght);
        output += String.fromCharCode(charCode);
    }
    return btoa(output);

}


function xorDecipher(encodedText, password) {
    let text=atob(encodedText);
    let output="";
    for(let i=0; i<text.length; i++){
        let charCode = text.charCodeAt(i) ^ password.charCodeAt(i % password.length);
    output += String.fromCharCode(charCode);
    }

    return output;
}


//index.html istvis 


const burnBtn = document.getElementById("burn-btn");

if (burnBtn) {
  burnBtn.addEventListener('click', async () => {
    const text = document.getElementById('note-text').value;
    const password = document.getElementById('note-password').value;
    if (!text || !password) return alert("Fill in the fields!");

    const encryptedData = xorCipher(text, password);

    const response = await fetch('/.netlify/functions/save-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encryptedNote: encryptedData })
    });
    
    const data = await response.json();
    const viewUrl = `${window.location.origin}/view.html?id=${data.noteId}`;
    
    document.getElementById('share-url').value = viewUrl;
    document.getElementById('link-output').classList.remove('hidden');
  });
}


//view.html istvis


const viewBtn = document.getElementById("view-btn");

if (viewBtn) {
  viewBtn.addEventListener('click', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const noteId = urlParams.get('id');
    const password = document.getElementById('decrypt-password').value;
    if (!noteId || !password) return alert("Missing ID or password!");

    const response = await fetch('/.netlify/functions/get-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ noteId })
    });

    const data = await response.json();
    if (!data.encryptedNote) {
        return alert("💥 Error: This note has already exploded or doesn't exist!");
    }

    try {
         const decrypted = xorDecipher(data.encryptedNote, password);
        document.getElementById('decrypted-text').textContent = decrypted;
        document.getElementById('password-area').classList.add('hidden');
         document.getElementById('secret-content').classList.remove('hidden');
    } catch (e) {
      alert("Wrong password!");
    }
  });
}