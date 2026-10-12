require 'xcodeproj'
require 'fileutils'

root = File.expand_path('..', __dir__)
project_path = File.join(root, 'ios/QuranAdhanQibla.xcodeproj')
project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |target| target.name == 'QuranAdhanQibla' }
target = project.targets.find { |item| item.name == 'QuranUITests' } || project.new_target(:ui_test_bundle, 'QuranUITests', :ios, '16.4')
target.add_dependency(app)
group = project.main_group.find_subpath('QuranUITests', true)
group.set_source_tree('SOURCE_ROOT')
group.set_path('QuranUITests')
source_dir = File.join(root, 'ios/QuranUITests')
FileUtils.mkdir_p(source_dir)
FileUtils.cp(File.join(root, 'scripts/ios/QuranUITests.swift'), source_dir)
file = group.files.find { |item| item.path == 'QuranUITests.swift' } || group.new_file('QuranUITests.swift')
target.source_build_phase.add_file_reference(file, true)
target.build_configurations.each do |configuration|
  configuration.build_settings.merge!({
    'SWIFT_VERSION' => '5.0',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'PRODUCT_BUNDLE_IDENTIFIER' => 'org.saadmusbeh.quranadhanqibla.uitests',
    'PRODUCT_NAME' => '$(TARGET_NAME)',
    'TEST_TARGET_NAME' => app.name,
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'CODE_SIGNING_ALLOWED' => 'NO',
    'FRAMEWORK_SEARCH_PATHS' => '$(inherited) $(PLATFORM_DIR)/Developer/Library/Frameworks',
  })
end
project.save
scheme = Xcodeproj::XCScheme.new(File.join(project_path, 'xcshareddata/xcschemes/QuranAdhanQibla.xcscheme'))
scheme.add_build_target(target, false)
scheme.add_test_target(target)
scheme.test_action.build_configuration = 'Release'
scheme.save_as(project_path, 'QuranAdhanQibla', true)
