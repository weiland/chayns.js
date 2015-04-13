// TODO(pascal): remove, since we can use the window.fetch directly
/* global fetch */
import {
  getLogger,
  isFormElement,
  isString,
  isObject,
  isFormData
  } from '../utils';

let log = getLogger('chayns.utils.http');

/**
 * Fetch JSON via GET
 *
 * @param {String} url
 * @returns {Promise} json result
 */
export function fetchJSON(url) {
  return fetch(url)
    .then(function(response) {
      return response.json();
    });
}

/**
 * Performs POST Request
 *
 * @param {String} url
 * @param {HTMLFormElement\FormData\URLSearchParams\USVString\Blob|BufferSource} form
 * @returns {Promise}
 */
export function postForm(url, form) {
  if (isFormElement(form)) {
    form = new FormData(form);
  }
  return fetch(url, {
    method: 'post',
    body: form
  });
}

/**
 * Post JSON
 *
 * @param {String} url
 * @param {`Object`} data Either Object or JSON String
 * @returns {boolean}
 */
export function post(url, data) {
  if (isObject(data)) {
    data = JSON.stringify(data);
  } else if (!isString(data)) {
    log.warn('postJSON: invalid data');
    Promise.reject(new Error('Invalid post data'));
  }
  return fetch(url, {
    method: 'post',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: data
  });
}

/**
 * Upload file
 * TODO: add additional params options
 * @param {String} url
 * @param {Input.file|FormData} data
 * @param {String} name
 * @returns {*}
 */
export function upload(url, data, name) {
  var form = new FormData();
  if (!isFormData(data)) {
    form.append(name || 'file', data);
  } else {
    form = data;
  }

  return fetch(url, {
    method: 'post',
    body: form
  });
}

/**
 * Fetch text or HTML via GET
 *
 * @param {String} url
 * @returns {Promise} with test result
 */
export function get(url) {
  return fetch(url)
    .then(function(response) {
      return response.text();
    });
}
