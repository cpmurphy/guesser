require 'rake/testtask'

desc 'Run tests'
Rake::TestTask.new do |t|
  t.libs << 'test'
  t.test_files = FileList['test/**/*_test.rb']
  t.verbose = true
end

desc 'Run UI tests'
task :ui_test do
  sh "npm run test_once"
end

desc 'Run all the tests'
task :test_all => [:test, :ui_test]

desc 'Copy 3rd party dependencies'
task :copy_deps do
  puts "Copying 3rd party dependencies..."
  sh "npm run copy-all"
end

task default: [:copy_deps, :test_all]

task :clean do
  for dir in %w(./public/scripts/3rdparty ./public/3rdparty-assets)
    sh "rm -r #{dir}/*"
  end
end

desc 'Build Docker image'
task docker_build: [:copy_deps] do
  puts "Building Docker image..."
  sh "docker build -t chess_guesser ."
end

desc 'Run Docker container'
task :docker_run do
  puts "Running Docker container..."
  sh "docker run -p 3000:3000 chess_guesser"
end
