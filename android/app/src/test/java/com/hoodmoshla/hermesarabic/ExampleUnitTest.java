package com.hoodmoshla.hermesarabic;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class ExampleUnitTest {
    @Test
    public void applicationIdIsIndependent() {
        assertEquals("com.hoodmoshla.hermesarabic", BuildConfig.APPLICATION_ID);
    }

    @Test
    public void versionIsCurrentDevelopmentRelease() {
        assertEquals("0.2.1", BuildConfig.VERSION_NAME);
    }
}
