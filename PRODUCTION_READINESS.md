# Production Readiness Checklist

## 🎯 Goal: Get friends to download and try Stoic Mirror

### ✅ What's Done
- ✅ App name branded as "Stoic Mirror" throughout UI
- ✅ README updated with setup instructions
- ✅ Security & privacy documentation (SECURITY.md)
- ✅ Error handling & network status indicators
- ✅ Authentication & data sync working
- ✅ Electron app structure ready

### 🚧 Critical Gaps for Beta Release

#### 1. **Branding Issues** (HIGH PRIORITY)
- ❌ `electron-builder.yml` still says "Mindful OS" → needs "Stoic Mirror"
- ❌ App ID is `com.mindfulos.app` → should be `com.stoicmirror.app`
- ❌ Missing proper app icon (.icns file) for macOS
- ⚠️ No logo/icon design assets (only placeholder)

#### 2. **Distribution** (HIGH PRIORITY)
- ❌ No way for friends to download the app easily
- ❌ No GitHub Releases set up for .dmg distribution
- ❌ Build process not tested for production
- ⚠️ macOS code signing not configured (will show warnings on first launch)

#### 3. **User Onboarding** (MEDIUM PRIORITY)
- ❌ No welcome/onboarding flow for first-time users
- ❌ No explanation of features when user first opens app
- ❌ No setup wizard for Ollama/Gemini configuration
- ⚠️ Supabase setup still requires manual SQL execution

#### 4. **Documentation** (MEDIUM PRIORITY)
- ⚠️ README is technical - non-developers might struggle
- ⚠️ No troubleshooting guide for common issues
- ⚠️ No video/screenshots showing app in action

#### 5. **Polish** (LOW PRIORITY)
- ⚠️ App metadata (description, version) could be enhanced
- ⚠️ Missing app bundle metadata for macOS Finder
- ⚠️ No changelog or version history

### 📋 Action Plan

#### Phase 1: Essential Branding (30 mins)
1. Update `electron-builder.yml` with correct name & app ID
2. Create/obtain app icon (or use simple placeholder)
3. Generate .icns file from PNG (or skip if icon doesn't exist)

#### Phase 2: Distribution Setup (1 hour)
1. Test `npm run build:app` creates working .dmg
2. Set up GitHub Releases for distribution
3. Create simple landing page or README with download link

#### Phase 3: First-Time User Experience (2-3 hours)
1. Add onboarding screen explaining tabs
2. Add AI setup wizard (detect Ollama, prompt for Gemini key)
3. Simplify Supabase setup (or provide pre-configured demo instance)

#### Phase 4: Polish & Testing (1-2 hours)
1. Update package.json metadata
2. Test on fresh macOS install
3. Document known issues/limitations

### 🎨 Branding Status

**Current:**
- UI: ✅ "Stoic Mirror" everywhere
- Package name: ✅ "stoic-mirror"
- Build config: ❌ Still "Mindful OS"
- App icon: ❌ Missing/placeholder

**What Friends Will See:**
- App name in Dock/menu bar: ✅ "Stoic Mirror"
- App name in Finder: ⚠️ May show package name or old name
- Installer: ❌ Will show old branding
- Icon: ❌ Generic/placeholder

### 🚀 Quick Wins (Do These First)

1. **Fix electron-builder.yml** (5 mins)
   - Change productName to "Stoic Mirror"
   - Change appId to "com.stoicmirror.app"

2. **Test build** (15 mins)
   - Run `npm run build:app`
   - Verify .dmg is created
   - Test installation

3. **Create simple download method** (30 mins)
   - Upload .dmg to cloud storage
   - Share link with friends
   - Or set up GitHub Releases

### 💡 Recommendations

**For Immediate Beta:**
- Fix branding in build config ✅ Essential
- Test build process ✅ Essential
- Create download link ✅ Essential
- Document known issues ⚠️ Nice to have

**For Better UX:**
- Add onboarding screens
- Auto-detect Ollama installation
- Provide demo/test Supabase instance

**For Professional Release:**
- Proper app icon design
- Code signing (Apple Developer account)
- App Store listing
- Privacy policy & terms

### 📝 Notes

- Friends will need Supabase accounts (or you provide shared instance)
- Ollama is optional (Gemini fallback works)
- macOS Gatekeeper may show warning without code signing (normal for beta)
- Can distribute via direct download initially, upgrade to App Store later
