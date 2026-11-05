# Capacitor'ın ürettiği Xcode projesine Diji Medu'nun yerel dosyalarını ekler (CI ve Mac'te tekrar çalıştırmak güvenli).
#   - DmBillingPlugin.swift, MainViewController.swift  → App hedefinin kaynakları
#   - native-runtime.js                                 → uygulama paketine (Copy Bundle Resources)
#   - App.entitlements (anlık bildirim)                 → CODE_SIGN_ENTITLEMENTS
require 'xcodeproj'

project_path = File.expand_path('../ios/App/App.xcodeproj', __dir__)
project = Xcodeproj::Project.open(project_path)
target = project.targets.find { |t| t.name == 'App' } or abort('App hedefi bulunamadı')
group = project.main_group['App'] or abort('App grubu bulunamadı')

def ensure_ref(group, name)
  group.files.find { |f| f.path == name } || group.new_reference(name)
end

%w[DmBillingPlugin.swift MainViewController.swift].each do |name|
  ref = ensure_ref(group, name)
  target.source_build_phase.add_file_reference(ref, true)
end
runtime = ensure_ref(group, 'native-runtime.js')
target.resources_build_phase.add_file_reference(runtime, true)
ensure_ref(group, 'App.entitlements')

target.build_configurations.each do |config|
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements'
end
project.save
puts 'Xcode projesi güncellendi.'
