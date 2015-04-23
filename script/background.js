var background = new function(){
    var _this = this;
    
    this.getRootPath = function(url){
        var match = url.match(/.*:\/\/[^\/]*/i);
        if (!match){
            return;
        }
        
        return match[0];
    }
    
    this.reloadChromeWindow = function(request, sender, callback){
        chrome.tabs.reload(request.tabId);
    }
    
    this.openChromeWindow = function(link, type){
        switch(type){
            case('popup'):
                chrome.windows.create({
                    'url': link,
                    'type': 'popup',
                    'width': 850
                });
            break;
            case('download'):
                chrome.downloads.download({
                    'url' : link
                });
            break;
            default:
                chrome.tabs.create({'url': link});
            break;
        }
    }
    
    this.collectData = function(request, sender, callback){
        var returnData = {
            state: false,
            tab: null
        };
        
        chrome.tabs.query({'active' : true}, function(tab){
            debugger;
            tab = tab[0];
            returnData.tab = tab;
            
            if (tab.url.substr(0, 7) != 'http://' && tab.url.substr(0, 8) != 'https://'){
                returnData.state = 'unavaliable';
                callback(returnData);
                return;
            }
            
            var version = chrome.runtime.getManifest().version;
            
            var xhr = new XMLHttpRequest();
            xhr.open('GET', _this.getRootPath(tab.url) + '?magento_debug_info=yes&current_version=' + version);
            xhr.send();
            
            xhr.onloadend = function() {
                if (xhr.status != 200) {
                    returnData.state = 'notinstalled';
                    callback(returnData);
                } else {
                    try {
                        returnData.backend = JSON.parse(xhr.responseText);
                    }
                    catch (exception_var) {
                        returnData.state = 'notinstalled';
                        callback(returnData);
                    }
                    finally {
                        if (typeof returnData.backend.version != 'string'){
                            returnData.state = 'notinstalled';
                            callback(returnData);
                        }
                        else if (returnData.backend.version != version){
                            returnData.state = 'update';
                            callback(returnData);
                        }
                        else if (returnData.backend.version == version){
                            chrome.cookies.getAll({url: tab.url}, function(cookies){
                                returnData.cookies = new Object();
                                
                                for(var f=0; f<cookies.length; f++){
                                    returnData.cookies[cookies[f].name] = cookies[f].value;
                                }
                                
                                returnData.state = 'avaliable';
                                callback(returnData);
                            });
                        }
                    }
                }
            }
        });
    }
    
    this.setCookie = function(request, sender, callback){
        chrome.cookies.set({url: request.url, name: request.key, path: '/', value: request.value});
    }
    
    this.ajax = function(request, sender, callback){
        var xhr = new XMLHttpRequest();
        xhr.open('GET', request.data.url);
        xhr.send();
        
        xhr.onloadend = function(data) {
            callback(xhr.responseText);
        }
    }
    
    this.init = function(){
        chrome.extension.onRequest.addListener(function(request, sender, callback) {
            debugger;
            switch(request.method){
                case('openChromeWindow'):
                    _this.openChromeWindow(request.link, request.type);
                break;
                case('collectData'):
                    _this.collectData(request, sender, callback);
                break;
                case('reloadChromeWindow'):
                    _this.reloadChromeWindow(request, sender, callback);
                break;
                case('setCookie'):
                    _this.setCookie(request, sender, callback);
                break;
                case('ajax'):
                    _this.ajax(request, sender, callback);
                break;
            }
        });
    }
    
    _this.init();
}