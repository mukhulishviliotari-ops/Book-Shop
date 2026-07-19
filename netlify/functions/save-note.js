global.noteDataBase = globalThis.noteDataBase || {};


expors.handler = async (event) =>{
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { encryptedNote } = JSON.parse(event.body);
    
    // Generate a random unique ID string
    const noteId = Math.random().toString(36).substring(2, 11);
    
    // Save it into the global network store
    global.noteDatabase[noteId] = encryptedNote;

    return {
      statusCode: 200,
      body: JSON.stringify({ noteId })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};