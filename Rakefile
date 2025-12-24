# frozen_string_literal: true

require 'rake/testtask'
require 'bundler/setup'

desc 'Run tests'
Rake::TestTask.new do |t|
  t.libs << 'test'
  t.test_files = FileList['test/**/*_test.rb'].exclude('test/smoke_test.rb')
  t.verbose = true
end

desc 'Run UI tests'
task :ui_test do
  sh 'npm run test_once'
end

desc 'Run a smoke test'
Rake::TestTask.new(:smoke) do |t|
  t.libs << 'test'
  t.test_files = FileList['test/smoke_test.rb']
  t.warning = false
end

desc 'Run all the tests'
task test_all: %i[test ui_test smoke]

desc 'Install npm dependencies'
task :npm_install do
  unless File.exist?('node_modules')
    puts 'Installing npm dependencies...'
    sh 'npm install'
  end
end

desc 'Copy 3rd party dependencies'
task copy_deps: [:npm_install] do
  puts 'Copying 3rd party dependencies...'
  sh 'npm run copy-all'
end

task default: %i[copy_deps test_all]

task :clean do
  %w[./public/scripts/3rdparty ./public/3rdparty-assets].each do |dir|
    sh "rm -rf #{dir}/*"
  end
end

desc 'Build Docker image'
task docker_build: [:copy_deps] do
  puts 'Building Docker image...'
  sh 'docker build -t chess_guesser .'
end

desc 'Run Docker container'
task :docker_run do
  puts 'Running Docker container...'
  sh 'docker run -p 3000:3000 chess_guesser'
end

desc 'Update asset manifest with new version'
task :bump_version do
  require 'json'
  require 'time'

  manifest = {
    'version' => Time.now.strftime('%Y%m%d.%H%M%S'),
    'last_updated' => Time.now.iso8601
  }

  File.write('public/asset-manifest.json', JSON.pretty_generate(manifest))
  puts "Updated asset manifest with version #{manifest['version']}"
end
