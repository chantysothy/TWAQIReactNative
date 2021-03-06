import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';

import HistoryItem from '../elements/history-item';

import { countyZh2En } from '../utils/county-mapping';
import { locations } from '../utils/locations';
import tracker from '../utils/tracker';
import I18n from '../utils/i18n';

const styles = StyleSheet.create({
  container: {
    marginLeft: 10,
    paddingRight: 10,
    borderBottomColor: '#EEEEEE',
    borderBottomWidth: 1,
  },
  groupNameBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
  },
  text: {
    fontWeight: '600',
    fontSize: 16,
  },
  noticeText: {
    fontSize: 12,
  },
  noticeWarningText: {
    fontSize: 10,
    marginBottom: 15,
  },
  list: {
    paddingVertical: 10,
  },
});

export default class HistoryGroup extends Component {
  static propTypes = {
    groupName: PropTypes.string.isRequired,
    navigation: PropTypes.shape({}).isRequired,
  }

  state = {
    locations: [],
    isOpen: false,
  };

  componentDidMount() {
    this.prepareLocations();
  }

  prepareLocations() {
    this.setState({ locations: locations.filter(item => item.County === this.props.groupName).sort() });
  }

  render() {
    const { groupName } = this.props;
    return (
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => {
            this.setState({ isOpen: !this.state.isOpen });
            tracker.logEvent('toggle-history-group', { label: groupName });
          }}
        >
          <View style={styles.groupNameBlock}>
            <Text style={styles.text}>{I18n.isZh ? groupName : countyZh2En[groupName]}</Text>
            <Icon name={this.state.isOpen ? 'keyboard-arrow-down' : 'chevron-right'} size={21} color="gray" />
          </View>
        </TouchableOpacity>
        {this.state.isOpen && <FlatList
          style={styles.list}
          data={this.state.locations}
          keyExtractor={(item, index) => `${index}-${item.key}`}
          renderItem={({ item }) => <HistoryItem item={item} navigation={this.props.navigation} />}
        />}
      </View>
    );
  }
}
