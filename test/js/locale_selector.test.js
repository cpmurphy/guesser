/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocaleSelector } from '../../public/scripts/locale_selector.js';

describe('LocaleSelector', () => {
  let localeSelector;
  let mockSelect;
  let mockEvent;
  let originalLocation;

  beforeEach(() => {
    // Mock document.getElementById
    mockSelect = document.createElement('select');
    mockSelect.id = 'locale-select';
    vi.spyOn(mockSelect, 'addEventListener').mockImplementation(() => {});
    vi.spyOn(document, 'getElementById').mockReturnValue(mockSelect);

    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: ''
    });

    // Mock window.location
    originalLocation = window.location;
    delete window.location;
    window.location = {
      reload: vi.fn()
    };

    // Create a mock event
    mockEvent = {
      target: {
        value: 'en'
      }
    };

    // Create new instance
    localeSelector = new LocaleSelector();
  });

  afterEach(() => {
    // Restore window.location
    window.location = originalLocation;
    vi.restoreAllMocks();
  });

  it('updates locale cookie based on chosen language', () => {
    mockEvent.target.value = 'fr';
    localeSelector.handleLocaleChange(mockEvent);

    expect(document.cookie).toBe('locale=fr;path=/;max-age=31536000');
    expect(window.location.reload).toHaveBeenCalled();
  });
}); 
