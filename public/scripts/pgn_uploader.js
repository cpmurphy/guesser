export class PgnUploader {

  constructor() {
    this.setupPgnInputMethod();
  }

  setupPgnInputMethod() {
    const fileRadio = document.getElementById('upload_method_file');
    const pasteRadio = document.getElementById('upload_method_paste');
    const fileContainer = document.getElementById('file_upload_container');
    const pasteContainer = document.getElementById('pgn_paste_container');
    const pgnFileInput = document.getElementById('pgn_file_input');
    const pgnTextArea = document.getElementById('pgn_text_input');
    const uploadButton = document.getElementById('upload_pgn_btn');

    const updateUploadButton = () => {
      const hasFile = Boolean(pgnFileInput.files?.length);
      const hasText = pgnTextArea.value.trim().length > 0;
      uploadButton.disabled = !hasFile && !hasText;
    };

    fileRadio.addEventListener('change', () => {
      fileContainer.style.display = 'block';
      pasteContainer.style.display = 'none';
      pgnTextArea.value = '';
      updateUploadButton();
    });

    pasteRadio.addEventListener('change', () => {
      fileContainer.style.display = 'none';
      pasteContainer.style.display = 'block';
      pgnFileInput.value = '';
      updateUploadButton();
    });

    pgnFileInput.addEventListener('change', updateUploadButton);
    pgnTextArea.addEventListener('input', updateUploadButton);
    updateUploadButton();
  }
}
