class LocaleSelector {
  constructor() {
    this.select = document.getElementById('locale-select');
    this.select.addEventListener('change', this.handleLocaleChange.bind(this));
  }

  handleLocaleChange(event) {
    const newLocale = event.target.value;
    // Store the selected locale in a cookie
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    // Reload the page to apply the new locale
    window.location.reload();
  }
} 