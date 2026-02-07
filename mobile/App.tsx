import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/navigation/AppNavigator';
import { notificationService } from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    // Initialize push notifications
    notificationService.registerForPushNotifications();
    
    // Add notification listeners
    notificationService.addNotificationListeners(
      (notification) => {
        console.log('Notification received:', notification);
      },
      (response) => {
        const data = response.notification.request.content.data;
        console.log('Notification response:', data);
        // Handle navigation based on notification data
      }
    );

    return () => {
      notificationService.removeNotificationListeners();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
