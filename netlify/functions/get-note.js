global.noteDatabase = global.noteDatabase || {};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { noteId } = JSON.parse(event.body);
    
    // Grab the encrypted data block
    const encryptedNote = global.noteDatabase[noteId];

    if (encryptedNote) {

      delete global.noteDatabase[noteId];

      return {
        statusCode: 200,
        body: JSON.stringify({ encryptedNote })
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Note not found or already burned." })
      };
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};