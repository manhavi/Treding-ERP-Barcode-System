#!/bin/bash

# Post-install script to fix React Native libraries for AGP 8.x
# This adds missing namespace declarations to library build.gradle files

echo "🔧 Patching React Native libraries for AGP 8.x compatibility..."

# Fix react-native-camera
CAMERA_BUILD_GRADLE="node_modules/react-native-camera/android/build.gradle"
if [ -f "$CAMERA_BUILD_GRADLE" ]; then
    if ! grep -q "namespace" "$CAMERA_BUILD_GRADLE"; then
        echo "Patching react-native-camera..."
        sed -i.bak '25a\
  namespace "org.reactnative.camera"
' "$CAMERA_BUILD_GRADLE"
        echo "✅ react-native-camera patched"
    else
        echo "✅ react-native-camera already patched"
    fi
fi

# Fix react-native-fs
FS_BUILD_GRADLE="node_modules/react-native-fs/android/build.gradle"
if [ -f "$FS_BUILD_GRADLE" ]; then
    if ! grep -q "namespace" "$FS_BUILD_GRADLE"; then
        echo "Patching react-native-fs..."
        # Add namespace after line 17 (android {)
        sed -i.bak '17a\
    namespace "com.rnfs"
' "$FS_BUILD_GRADLE"
        echo "✅ react-native-fs patched"
    else
        echo "✅ react-native-fs already patched"
    fi
fi

# Fix react-native-html-to-pdf
HTML_TO_PDF_BUILD_GRADLE="node_modules/react-native-html-to-pdf/android/build.gradle"
if [ -f "$HTML_TO_PDF_BUILD_GRADLE" ]; then
    if ! grep -q "namespace" "$HTML_TO_PDF_BUILD_GRADLE"; then
        echo "Patching react-native-html-to-pdf..."
        # Add namespace after line 21 (android {)
        sed -i.bak '21a\
     namespace "com.christopherdro.htmltopdf"
' "$HTML_TO_PDF_BUILD_GRADLE"
        echo "✅ react-native-html-to-pdf patched"
    else
        echo "✅ react-native-html-to-pdf already patched"
    fi
fi

# Fix react-native-vector-icons - Enable BuildConfig feature for AGP 8.x
VECTOR_ICONS_BUILD_GRADLE="node_modules/react-native-vector-icons/android/build.gradle"
if [ -f "$VECTOR_ICONS_BUILD_GRADLE" ]; then
    if ! grep -q "buildFeatures" "$VECTOR_ICONS_BUILD_GRADLE"; then
        echo "Patching react-native-vector-icons..."
        # Add buildFeatures after line 25 (compileSdkVersion)
        sed -i.bak '25a\
\
    buildFeatures {\
        buildConfig = true\
    }
' "$VECTOR_ICONS_BUILD_GRADLE"
        echo "✅ react-native-vector-icons patched"
    else
        echo "✅ react-native-vector-icons already patched"
    fi
fi

# Fix react-native-screens - Enable BuildConfig feature for AGP 8.x
SCREENS_BUILD_GRADLE="node_modules/react-native-screens/android/build.gradle"
if [ -f "$SCREENS_BUILD_GRADLE" ]; then
    if ! grep -q "buildFeatures" "$SCREENS_BUILD_GRADLE"; then
        echo "Patching react-native-screens..."
        # Add buildFeatures after line 53 (namespace declaration)
        sed -i.bak '53a\
\
    buildFeatures {\
        buildConfig = true\
    }
' "$SCREENS_BUILD_GRADLE"
        echo "✅ react-native-screens patched"
    else
        echo "✅ react-native-screens already patched"
    fi
fi

echo "✅ All libraries patched successfully!"
