Pod::Spec.new do |s|
  s.name           = 'IslamicCore'
  s.version        = '0.1.0'
  s.summary        = 'Rust Qibla calculations for React Native'
  s.description    = 'A local Expo module bridging the shared Rust core to iOS.'
  s.author         = 'saad-musbeh'
  s.homepage       = 'https://github.com/saad-musbeh/quran-adhan-qibla'
  s.license        = { :type => 'MIT', :file => '../../../LICENSE' }
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { :git => 'https://github.com/saad-musbeh/quran-adhan-qibla.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '*.{h,m,mm,swift}'
  s.vendored_frameworks = 'Frameworks/IslamicCoreFFI.xcframework'
end
