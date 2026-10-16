package com.hoodmoshla.hermesarabic;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class ExampleUnitTest {
    @Test
    public void applicationIdIsIndependent() {
        assertEquals("com.hoodmoshla.hermesarabic", BuildConfig.APPLICATION_ID);
    }

    @Test
    public void versionCodeAndNameMatchLocalCandidate() {
        assertEquals(6, BuildConfig.VERSION_CODE);
        assertEquals("0.2.4", BuildConfig.VERSION_NAME);
    }
}
