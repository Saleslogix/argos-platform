/* Copyright 2017 Infor
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @module argos/actions
 */

// action Types
define('argos/actions/index', [], () => {
  const SET_MAX_VIEWPORTS = 'SET_MAX_VIEWPORTS';

  const INSERT_HISTORY = 'INSERT_HISTORY';

  function setMaxViewPorts(max) {
    return {
      type: SET_MAX_VIEWPORTS,
      payload: {
        max,
      },
    };
  }

  function insertHistory(data) {
    return {
      type: INSERT_HISTORY,
      payload: {
        data,
      },
    };
  }

  return {
    SET_MAX_VIEWPORTS,
    INSERT_HISTORY,
    setMaxViewPorts,
    insertHistory,
  };
});
