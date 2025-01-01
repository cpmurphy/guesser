class AssetVersion
  class << self
    def version
      @version ||= if production?
        production_version
      else
        development_version
      end
    end

    private

    def production_version
      manifest_version || fallback_version
    end

    def manifest_version
      return unless File.exist?(manifest_path)
      @manifest_version ||= JSON.parse(File.read(manifest_path))['version']
    rescue JSON::ParserError
      nil
    end

    def development_version
      Time.now.to_i.to_s
    end

    def fallback_version
      '1.0.0'
    end

    def manifest_path
      File.join(root_path, 'public', 'asset-manifest.json')
    end

    def root_path
      File.expand_path('../..', __FILE__)
    end

    def production?
      ENV['RACK_ENV'] == 'production'
    end
  end
end 