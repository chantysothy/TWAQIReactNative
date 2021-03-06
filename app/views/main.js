import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  ActivityIndicator,
  DeviceEventEmitter,
  Dimensions,
  NativeModules,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ifIphoneX } from 'react-native-iphone-x-helper';
import { iOSColors } from 'react-native-typography';
import firebase from 'react-native-firebase';
import FusedLocation from 'react-native-fused-location';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MapView from 'react-native-maps';
import store from 'react-native-simple-store';
import timer from 'react-native-timer';

import AdMob from '../elements/admob';
import Indicator from '../elements/indicator';
import Marker from '../elements/marker';
import Rating from '../elements/rating';

import { aqi } from '../utils/api';
import { indexTypes } from '../utils/indexes';
import { locations } from '../utils/locations';
import I18n from '../utils/i18n';
import log from '../utils/log';
import tracker from '../utils/tracker';

const { width, height } = Dimensions.get('window');

const { RNLocation } = NativeModules;

const ASPECT_RATIO = width / height;
const LATITUDE = 23.3;
const LONGITUDE = 120.8;
const LATITUDE_DELTA = 4.4;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const OUT_OF_BOUND = 30;
const RELOAD_INTERVAL = 10 * 60 * 1000;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  defaultLocation: {
    position: 'absolute',
    right: 12,
    bottom: 168,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    height: 52,
    width: 52,
    borderRadius: 26,
  },
  currentLocation: {
    position: 'absolute',
    right: 12,
    bottom: 108,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    height: 52,
    width: 52,
    borderRadius: 26,
  },
  refreshContainer: {
    ...ifIphoneX({
      top: 35,
    }, {
      top: Platform.OS === 'ios' ? 30 : 0,
    }),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  refreshContainerBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshContainerText: {
    fontSize: 12,
  },
  buttonContainer: {
    height: 45,
    flexGrow: 0,
  },
  bubble: {
    height: 42,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 2,
    paddingVertical: 6,
    borderRadius: 20,
    borderColor: iOSColors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBubble: {
    borderColor: iOSColors.tealBlue,
  },
  button: {
    width: 56,
    paddingHorizontal: 2,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  text: {
    fontSize: 12,
  },
});

export default class MainView extends Component {
  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
    }).isRequired,
  }

  static navigationOptions = {
    header: null,
    tabBarLabel: I18n.t('main'),
    tabBarIcon: ({ tintColor }) => <Icon name="place" size={19} color={tintColor} />,
  };

  static isOutOfBound(latitude, longitude) {
    const distance = ((latitude - LATITUDE) * (latitude - LATITUDE)) + ((longitude - LONGITUDE) * (longitude - LONGITUDE));
    console.log('Distance', distance);
    return distance > OUT_OF_BOUND;
  }

  static getDefaultLocation() {
    return {
      latitude: LATITUDE,
      longitude: LONGITUDE,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    };
  }

  state = {
    location: {
      latitude: LATITUDE,
      longitude: LONGITUDE,
    },
    selectedIndex: indexTypes[0].key,
    isLoading: false,
    gpsEnabled: false,
  };

  onRegionChange(region) {
    console.log(region);
    this.setState({ region, selectedLocation: null });
  }

  getCurrentLocation() {
    return {
      latitude: this.state.location.latitude,
      longitude: this.state.location.longitude,
      latitudeDelta: this.state.gpsEnabled ? 0.2 : LATITUDE_DELTA,
      longitudeDelta: this.state.gpsEnabled ? 0.2 * ASPECT_RATIO : LONGITUDE_DELTA,
    };
  }

  prepareData() {
    this.setState({ isLoading: true }, () => {
      const that = this;
      store.delete('aqiResult');
      const trace = firebase.perf().newTrace('api_get_aqi');
      trace.start();
      aqi().then((result) => {
        const keys = Object.keys(result || {}).length;
        console.log('AQI:', result);
        console.log('AQI length:', keys);
        if (result && keys > 0) {
          that.setState({ aqiResult: result });
        }

        that.setState({ isLoading: false });
        trace.stop();
      });
    });
  }

  loadMapContent = async () => {
    const that = this;
    store.get('selectedIndex').then((selectedIndex) => {
      if (selectedIndex) {
        that.setState({
          selectedIndex,
        });
      }
    });

    if (Platform.OS === 'ios') {
      RNLocation.requestWhenInUseAuthorization();
      // RNLocation.requestAlwaysAuthorization();
      RNLocation.startUpdatingLocation();
      RNLocation.setDistanceFilter(5.0);

      let first = true;
      DeviceEventEmitter.addListener('locationUpdated', (location) => {
        console.log('Location updated', location);
        this.setState({
          location: location.coords,
          gpsEnabled: true,
        });

        if (first) {
          first = false;
          timer.setTimeout(this, 'MoveInitialLocation', () => {
            const moveLocation = MainView.isOutOfBound(location.coords.latitude, location.coords.longitude) ? MainView.getDefaultLocation() : this.getCurrentLocation();
            try {
              this.map.animateToRegion(moveLocation);
            } catch (err) {
              log.logError(`Map animateToRegion failed: ${JSON.stringify(err)}`);
            }
          }, 2000);
        }
      });
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '應用程序需要訪問您的位置',
          message: '應用程序需要訪問您的位置',
        },
      );
      console.log('granted', granted);
      if (granted) {
        FusedLocation.setLocationPriority(FusedLocation.Constants.HIGH_ACCURACY);

        console.log('Getting GPS location');
        // Get location once
        const location = await FusedLocation.getFusedLocation();
        if (location.latitude && location.longitude) {
          this.setState({
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
            gpsEnabled: true,
          });

          if (MainView.isOutOfBound(location.latitude, location.longitude)) {
            this.map.animateToRegion(MainView.getDefaultLocation());
          } else {
            this.map.animateToRegion(this.getCurrentLocation());
          }
        }

        // Set options.
        FusedLocation.setLocationPriority(FusedLocation.Constants.BALANCED);
        FusedLocation.setLocationInterval(3000);
        FusedLocation.setFastestLocationInterval(1500);
        FusedLocation.setSmallestDisplacement(10);

        // Keep getting updated location.
        FusedLocation.startLocationUpdates();

        // Place listeners.
        this.subscription = FusedLocation.on('fusedLocation', (updatedLocation) => {
          console.log('GPS location updated', updatedLocation);
          this.setState({
            location: {
              latitude: updatedLocation.latitude,
              longitude: updatedLocation.longitude,
            },
            gpsEnabled: true,
          });
        });
      }
    }

    this.prepareData();
    timer.setInterval(this, 'ReloadDataInterval', () => this.prepareData(), RELOAD_INTERVAL);
  }

  render() {
    const { navigation } = this.props;

    tracker.view('Main');
    return (
      <View style={styles.container}>
        <MapView
          style={styles.map}
          ref={(ref) => { this.map = ref; }}
          initialRegion={this.getCurrentLocation()}
          onRegionChange={region => this.onRegionChange(region)}
          onMapReady={this.loadMapContent}
          showsUserLocation={true}
        >
          {this.state.aqiResult && locations
            .filter(i => this.state.aqiResult[i.SiteName])
            .map(location => (
              <MapView.Marker
                key={location.SiteEngName}
                coordinate={{
                  latitude: parseFloat(location.TWD97Lat),
                  longitude: parseFloat(location.TWD97Lon),
                }}
                onPress={() => {
                  this.setState({ selectedLocation: location.SiteName });
                  this.map.animateToRegion({
                    latitude: parseFloat(location.TWD97Lat),
                    longitude: parseFloat(location.TWD97Lon),
                    latitudeDelta: LATITUDE_DELTA,
                    longitudeDelta: LONGITUDE_DELTA,
                  });
                  tracker.logEvent('select-location', location);
                }}
              >
                <View>
                  <Marker
                    amount={this.state.aqiResult[location.SiteName][this.state.selectedIndex]}
                    index={this.state.selectedIndex}
                    isNumericShow={true}
                  />
                </View>
                <MapView.Callout>
                  <TouchableOpacity
                    onPress={() => {
                      tracker.logEvent('check-main-details', location);
                      navigation.navigate('MainDetails', { item: location });
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: I18n.isZh ? 50 : 80,
                        marginLeft: 10,
                      }}
                    >
                      <Text>{I18n.isZh ? location.SiteName : location.SiteEngName}</Text>
                      <Icon name="chevron-right" size={24} color="gray" />
                    </View>
                  </TouchableOpacity>
                </MapView.Callout>
              </MapView.Marker>))}
        </MapView>

        <TouchableOpacity
          onPress={() => {
            this.prepareData();
            tracker.logEvent('fetch-latest-data');
          }}
          style={styles.refreshContainer}
        >
          <View style={styles.refreshContainerBody}>
            <Text style={styles.refreshContainerText}>{this.state.aqiResult && this.state.aqiResult['中山'] && this.state.aqiResult['中山'].PublishTime}</Text>
            {!this.state.isLoading && <Icon name="refresh" style={{ marginLeft: 5 }} size={20} color="#616161" />}
            {this.state.isLoading && <ActivityIndicator style={{ marginLeft: 5 }} />}
          </View>
        </TouchableOpacity>

        <Indicator />

        <Rating />

        {Platform.OS === 'ios' &&
          <TouchableOpacity
            style={styles.defaultLocation}
            onPress={() => {
              this.map.animateToRegion(MainView.getDefaultLocation());
              tracker.logEvent('move-to-default-location');
            }}
          >
            <Icon name="crop-free" size={28} color={iOSColors.gray} />
          </TouchableOpacity>}

        {Platform.OS === 'ios' && this.state.gpsEnabled &&
          <TouchableOpacity
            style={styles.currentLocation}
            onPress={() => {
              this.map.animateToRegion(this.getCurrentLocation());
              tracker.logEvent('move-to-current-location');
            }}
          >
            <Icon name="near-me" size={28} color={iOSColors.gray} />
          </TouchableOpacity>}

        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.buttonContainer}>
            {indexTypes.map(item => (
              <TouchableOpacity
                key={item.key}
                onPress={() => {
                  this.setState({ selectedIndex: item.name });
                  store.save('selectedIndex', item.name);
                  tracker.logEvent('select-index', { label: item.name });
                  console.log('Select index', item.name);
                }}
                style={[styles.bubble, styles.button, this.state.selectedIndex === item.name ? styles.selectedBubble : {}]}
              >
                <Text style={styles.text}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <AdMob unitId="twaqi-ios-main-footer" />
        </View>

      </View>
    );
  }
}
