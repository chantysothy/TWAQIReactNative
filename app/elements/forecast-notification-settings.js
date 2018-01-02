import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import firebase from 'react-native-firebase';
import OneSignal from 'react-native-onesignal';

import I18n from '../utils/i18n';
import tracker from '../utils/tracker';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
    fontSize: 16,
  },
});

export default class ForecastNotificationSettings extends Component {
  static sendTags(value) {
    const tags = {
      isForecastEnabled: value,
    };

    console.log('Send tags', tags);
    OneSignal.sendTags(tags);

    tracker.logEvent('set-forecast-notification', { label: value ? 'on' : 'off' });
  }

  state = {
    isEnabled: false,
  }

  componentDidMount() {
    const that = this;
    const trace = firebase.perf().newTrace('onesignal_get_tags');
    trace.start();
    OneSignal.getTags((tags) => {
      trace.stop();
      console.log('OneSignal tags', tags);
      receivedTags = tags || {};

      that.setState({
        isEnabled: receivedTags.isForecastEnabled === 'true',
      });
    });
  }

  setNotification = (value) => {
    this.setState({ isEnabled: value }, () => {
      ForecastNotificationSettings.sendTags(value);

      if (value && Platform.OS === 'ios') {
        permissions = {
          alert: true,
          badge: true,
          sound: true,
        };
        OneSignal.requestPermissions(permissions);
        OneSignal.registerForPushNotifications();
      }
    });
  }

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>{I18n.t('forecast_notification_label')}</Text>
        <Switch
          onValueChange={this.setNotification}
          value={this.state.isEnabled}
          tintColor="#E0E0E0"
        />
      </View>
    );
  }
}
