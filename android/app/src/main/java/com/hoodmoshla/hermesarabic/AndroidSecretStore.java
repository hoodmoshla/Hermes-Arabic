package com.hoodmoshla.hermesarabic;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Small Android Keystore-backed encrypted preference store. */
final class AndroidSecretStore {
    private static final String PREFS = "hermes-private-secrets-v1";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int TAG_BITS = 128;

    private AndroidSecretStore() {}

    static synchronized void put(Context context, String alias, String preference, String value) throws Exception {
        SecretKey key = getOrCreateKey(alias);
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, key);
        byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        byte[] iv = cipher.getIV();
        byte[] packed = new byte[iv.length + encrypted.length];
        System.arraycopy(iv, 0, packed, 0, iv.length);
        System.arraycopy(encrypted, 0, packed, iv.length, encrypted.length);
        prefs(context).edit().putString(preference, Base64.encodeToString(packed, Base64.NO_WRAP)).apply();
    }

    static synchronized String get(Context context, String alias, String preference) throws Exception {
        String encoded = prefs(context).getString(preference, "");
        if (encoded == null || encoded.isEmpty()) return "";
        byte[] packed = Base64.decode(encoded, Base64.NO_WRAP);
        if (packed.length <= 12 + TAG_BITS / 8) throw new IllegalStateException("Encrypted secret is truncated");
        byte[] iv = new byte[12];
        byte[] ciphertext = new byte[packed.length - iv.length];
        System.arraycopy(packed, 0, iv, 0, iv.length);
        System.arraycopy(packed, iv.length, ciphertext, 0, ciphertext.length);
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(alias), new GCMParameterSpec(TAG_BITS, iv));
        return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
    }

    static void remove(Context context, String preference) {
        prefs(context).edit().remove(preference).apply();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static SecretKey getOrCreateKey(String alias) throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);
        java.security.Key existing = keyStore.getKey(alias, null);
        if (existing instanceof SecretKey) return (SecretKey) existing;
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
        generator.init(new KeyGenParameterSpec.Builder(alias,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build());
        return generator.generateKey();
    }
}
