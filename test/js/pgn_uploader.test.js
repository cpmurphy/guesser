/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PgnUploader } from '../../public/scripts/pgn_uploader.js';

describe('PgnUploader', () => {
  let pgnUploader;
  let mockFileRadio;
  let mockPasteRadio;
  let mockFileContainer;
  let mockPasteContainer;
  let mockPgnFileInput;
  let mockPgnTextArea;
  let mockUploadButton;

  beforeEach(() => {
    // Create mock DOM elements
    mockFileRadio = document.createElement('input');
    mockFileRadio.type = 'radio';
    mockFileRadio.id = 'upload_method_file';

    mockPasteRadio = document.createElement('input');
    mockPasteRadio.type = 'radio';
    mockPasteRadio.id = 'upload_method_paste';

    mockFileContainer = document.createElement('div');
    mockFileContainer.id = 'file_upload_container';
    mockFileContainer.style.display = 'none';

    mockPasteContainer = document.createElement('div');
    mockPasteContainer.id = 'pgn_paste_container';
    mockPasteContainer.style.display = 'none';

    mockPgnFileInput = document.createElement('input');
    mockPgnFileInput.type = 'file';
    mockPgnFileInput.id = 'pgn_file_input';
    installFileSelectionBehavior(mockPgnFileInput);

    mockPgnTextArea = document.createElement('textarea');
    mockPgnTextArea.id = 'pgn_text_input';

    mockUploadButton = document.createElement('button');
    mockUploadButton.id = 'upload_pgn_btn';

    // Mock document.getElementById
    vi.spyOn(document, 'getElementById')
      .mockImplementation((id) => {
        switch (id) {
          case 'upload_method_file':
            return mockFileRadio;
          case 'upload_method_paste':
            return mockPasteRadio;
          case 'file_upload_container':
            return mockFileContainer;
          case 'pgn_paste_container':
            return mockPasteContainer;
          case 'pgn_file_input':
            return mockPgnFileInput;
          case 'pgn_text_input':
            return mockPgnTextArea;
          case 'upload_pgn_btn':
            return mockUploadButton;
          default:
            return null;
        }
      });

    // Create new instance
    pgnUploader = new PgnUploader();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with correct elements', () => {
    expect(document.getElementById).toHaveBeenCalledWith('upload_method_file');
    expect(document.getElementById).toHaveBeenCalledWith('upload_method_paste');
    expect(document.getElementById).toHaveBeenCalledWith('file_upload_container');
    expect(document.getElementById).toHaveBeenCalledWith('pgn_paste_container');
    expect(document.getElementById).toHaveBeenCalledWith('pgn_file_input');
    expect(document.getElementById).toHaveBeenCalledWith('pgn_text_input');
    expect(document.getElementById).toHaveBeenCalledWith('upload_pgn_btn');
  });

  it('starts with the upload button disabled', () => {
    expect(mockUploadButton.disabled).toBe(true);
  });

  it('enables the upload button when a file is chosen', () => {
    selectPgnFile(mockPgnFileInput, 'game.pgn');

    expect(mockUploadButton.disabled).toBe(false);
  });

  it('disables the upload button when the chosen file is cleared', () => {
    selectPgnFile(mockPgnFileInput, 'game.pgn');
    mockPgnFileInput.value = '';
    mockPgnFileInput.dispatchEvent(new Event('change'));

    expect(mockUploadButton.disabled).toBe(true);
  });

  it('enables the upload button when PGN text is entered', () => {
    mockPgnTextArea.value = '1. e4 e5';
    mockPgnTextArea.dispatchEvent(new Event('input'));

    expect(mockUploadButton.disabled).toBe(false);
  });

  it('keeps the upload button disabled for whitespace-only PGN text', () => {
    mockPgnTextArea.value = '   \n\t';
    mockPgnTextArea.dispatchEvent(new Event('input'));

    expect(mockUploadButton.disabled).toBe(true);
  });

  it('disables the upload button when pasted PGN text is cleared', () => {
    mockPgnTextArea.value = '1. e4 e5';
    mockPgnTextArea.dispatchEvent(new Event('input'));
    mockPgnTextArea.value = '';
    mockPgnTextArea.dispatchEvent(new Event('input'));

    expect(mockUploadButton.disabled).toBe(true);
  });

  it('disables the upload button when switching to paste clears a chosen file', () => {
    selectPgnFile(mockPgnFileInput, 'game.pgn');

    mockPasteRadio.dispatchEvent(new Event('change'));

    expect(mockPgnFileInput.value).toBe('');
    expect(mockUploadButton.disabled).toBe(true);
  });

  it('disables the upload button when switching to file clears pasted text', () => {
    mockPgnTextArea.value = '1. e4 e5';
    mockPgnTextArea.dispatchEvent(new Event('input'));

    mockFileRadio.dispatchEvent(new Event('change'));

    expect(mockPgnTextArea.value).toBe('');
    expect(mockUploadButton.disabled).toBe(true);
  });

  it('switches to file upload mode when file radio is selected', () => {
    // Trigger file radio change event
    mockFileRadio.dispatchEvent(new Event('change'));

    expect(mockFileContainer.style.display).toBe('block');
    expect(mockPasteContainer.style.display).toBe('none');
    expect(mockPgnTextArea.value).toBe('');
  });

  it('switches to paste mode when paste radio is selected', () => {
    // Trigger paste radio change event
    mockPasteRadio.dispatchEvent(new Event('change'));

    expect(mockFileContainer.style.display).toBe('none');
    expect(mockPasteContainer.style.display).toBe('block');
    expect(mockPgnFileInput.value).toBe('');
  });

  it('maintains correct state after multiple switches', () => {
    // Switch to file mode
    mockFileRadio.dispatchEvent(new Event('change'));
    expect(mockFileContainer.style.display).toBe('block');
    expect(mockPasteContainer.style.display).toBe('none');

    // Switch to paste mode
    mockPasteRadio.dispatchEvent(new Event('change'));
    expect(mockFileContainer.style.display).toBe('none');
    expect(mockPasteContainer.style.display).toBe('block');

    // Switch back to file mode
    mockFileRadio.dispatchEvent(new Event('change'));
    expect(mockFileContainer.style.display).toBe('block');
    expect(mockPasteContainer.style.display).toBe('none');
  });
});

function selectPgnFile(input, name) {
  input.setSelectedFiles([new File(['[Event "Test"]\n\n1. e4 e5'], name)]);
  input.dispatchEvent(new Event('change'));
}

// jsdom has no DataTransfer, so file selection cannot be assigned through the
// input. Clearing the value also does not empty a stubbed FileList. Mirror the
// browser: a chosen file populates `files`, and setting value to '' clears it.
function installFileSelectionBehavior(input) {
  const valueDescriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value');
  let files = { length: 0 };

  Object.defineProperty(input, 'files', {
    configurable: true,
    get: () => files
  });

  Object.defineProperty(input, 'value', {
    configurable: true,
    get() {
      return valueDescriptor.get.call(this);
    },
    set(next) {
      valueDescriptor.set.call(this, next);
      if (next === '') {
        files = { length: 0 };
      }
    }
  });

  input.setSelectedFiles = (selected) => {
    files = { length: selected.length, 0: selected[0] };
  };
} 
