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

    mockPgnTextArea = document.createElement('textarea');
    mockPgnTextArea.id = 'pgn_text_input';

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
