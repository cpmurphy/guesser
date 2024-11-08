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

task default: :test_all

# New tasks for Docker

desc 'Build Docker image'
task :docker_build do
  puts "Building Docker image..."
  sh "docker build -t chess_guesser ."
end

desc 'Run Docker container'
task :docker_run do
  puts "Running Docker container..."
  sh "docker run -p 3000:3000 chess_guesser"
end
