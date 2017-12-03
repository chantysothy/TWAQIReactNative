import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';

import AdMob from '../elements/admob';
import ForecastNotificationSettings from '../elements/forecast-notification-settings';

import aqfn from '../utils/aqfn';
import I18n from '../utils/i18n';
import tracker from '../utils/tracker';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  titleBlock: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingLeft: 10,
    paddingBottom: 10,
  },
  titleText: {
    fontSize: 24,
    color: 'black',
  },
  permissionReminderBlock: {
    backgroundColor: '#3949AB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 1,
  },
  permissionReminderText: {
    fontSize: 12,
    color: 'white',
  },
});

export default class ForecastView extends Component {
  static navigationOptions = {
    header: null,
    title: 'Help',
    tabBarLabel: I18n.t('forecast'),
    tabBarIcon: ({ tintColor }) => (
      <Icon name="track-changes" size={21} color={tintColor || 'gray'} />
    ),
  };

  state = {
    aqfnResult: null,
  }

  componentDidMount() {
    aqfn().then((json) => {
      console.log('aqfnResult', json);
      this.setState({ aqfnResult: json });
    });
  }

  render() {
    tracker.view('Forecast');
    return (
      <View style={styles.container}>
        <View style={styles.titleBlock}>
          <Text style={styles.titleText}>{I18n.t('forecast_title')}</Text>
        </View>

        <ForecastNotificationSettings />
        <View style={{ flex: 1, padding: 10 }}>
          <Text style={{ lineHeight: 22, fontSize: 14 }}>{this.state.aqfnResult && this.state.aqfnResult[0] && this.state.aqfnResult[0].Content}</Text>
        </View>
        <AdMob />
      </View>
    );
  }
}
