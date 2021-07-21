const envVariables = require('../envVariables')
const registryUrl = envVariables['OPENSABER_SERVICE_URL']
const axios = require('axios');
const _ = require("lodash");

class RegistryService {

    constructor() {
    }

    async getOrgDetails(orgFilters) {
      const option = {
        url: registryUrl + '/search',
        method: 'post',
        headers: this.getDefaultHeaders(),
        data: {
          "id": "open-saber.registry.search",
          "request": {
            "entityType": ["Org"],
            "filters": {
              ...orgFilters
            }
          }
        }
      };
      return axios(option);
    }

    async getUserList(data, userIds) {
      const filters = _.get(data.request, 'filters.user');
      const option = {
        url: registryUrl + '/search',
        method: 'post',
        headers: this.getDefaultHeaders(),
        data: {
          "id": "open-saber.registry.search",
          "request": {
            "entityType": ["User"],
            "filters": {
              ...filters,
              "osid": { "or": userIds }
            }
          }
        }
      };
      return axios(option);
    }

    async getOrgUserList(data) {
      const filters = _.get(data.request, 'filters.user_org');
      const option = {
        url: registryUrl + '/search',
        method: 'post',
        headers: this.getDefaultHeaders(),
        data: {
          "id": "open-saber.registry.search",
          "request": {
            "entityType": ["User_Org"],
            "filters": {
              ..._.pick(filters, 'orgId')
            },
            "limit": _.get(data.request, 'limit') || 250,
            "offset": _.get(data.request, 'offset') || 0
          }
        }
      };

      const orgApiRes = await axios(option);
      const roles = _.get(filters, 'roles');
      const filteredList = _.filter(_.get(orgApiRes, 'data.result.User_Org'), obj => {
        const isHavingRoles = _.intersection(roles, obj.roles);
        if (isHavingRoles.length > 0) {
          return obj
        }
      });

      return {
        "result": filteredList,
        "count": _.get(orgApiRes, 'data.result.User_Org').length
      };
    }

    addRecord(value, callback) {
      const headers = this.getDefaultHeaders()
        axios.post(registryUrl+'/add', value.body, headers)
          .then((res) =>{
            callback(null, res)
          },
          (error)=>{
            callback(error)
          });

    }

    updateRecord(value, callback) {
      const  headers = this.getDefaultHeaders()

        axios.post(registryUrl+'/update', value.body, headers)
        .then((res) =>{
          callback(null, res)
        },
        (error)=>{
          callback(error)
        });

    }

    readRecord(value, callback) {
      const headers = this.getDefaultHeaders()

        axios.post(registryUrl+'/read', value.body, headers)
        .then((res) =>{
          callback(null, res)
        },
        (error)=>{
          callback(error)
        });
    }

    searchRecord(value, callback) {
        const headers = this.getDefaultHeaders()

        axios.post(registryUrl+'/search', value.body, headers)
        .then((res) =>{
          callback(null, res)
        },
        (error)=>{
          callback(error,null)
        });
    }

    searchAuditRecords(value, callback) {
      const  headers = this.getDefaultHeaders()

        axios.post(registryUrl+"/audit", value.body, headers)
        .then((res) =>{
          callback(null, res)
        },
        (error)=>{
          callback(error)
        });
    }

    getDefaultHeaders() {
        let headers = {
            'content-type': 'application/json',
            'accept': 'application/json'
        }
        return headers;
    }
}


module.exports = RegistryService;
