import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';

// Home screen : When the user is able to successfully register from the registration page then they are redirected to this page. 
// Next step would be to use the PIN to acces the wallet. 

export default function Home() {
    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>
                Welcome to Trinity College Wallet
            </ThemedText>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        textAlign: 'center',
    },
});