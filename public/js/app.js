(function () {
    'use strict'

    angular
        .module("Demo", [
            "ngResource",
            "ui.router",
            "ngSanitize",
            "ui.bootstrap",
            "LocalStorageModule"
        ])
        // Etsy base url
        .value('API_BASE_URL', 'https://openapi.etsy.com/v2/listings')

        // Etsy API key (Eugenio)
        .value('API_KEY', 'q7ea57pzppjoamtn54ippg8i')

        // Configure localStorage to save the cart
        .config(function (localStorageServiceProvider) {
            localStorageServiceProvider.setPrefix('etsyTestOg')
        })
        // Configure url routes
        .config(function ($stateProvider, $urlRouterProvider) {
            $stateProvider
                .state('home', {
                    url: '/',
                    views: {
                        'content@': {
                            templateUrl: 'views/main.html',
                            controller: 'ShopController'
                        },
                        'navbar@': {
                            templateUrl: 'views/partial/search.html',
                            controller: 'SearchController'
                        },
                        'cartbar@': {
                            templateUrl: 'views/partial/cart.html',
                            controller: 'CartController'
                        }

                    }
                })
                .state('home.search', {
                    url: 'search/:term',
                    views: {
                        'content@': {
                            templateUrl: 'views/main.html',
                            controller: 'ShopController'
                        },
                    }
                })
                .state('home.productDetail', {
                    url: 'product/:id',
                    views: {
                        'content@': {
                            templateUrl: 'views/detail.html',
                            controller: 'ShopDetailController'
                        }
                    }

                })

            $urlRouterProvider.otherwise('/')

        })
        .directive('photoGallery', function () {
            return {
                restrict: 'E',
                templateUrl: 'views/partial/photoGallery.html',
                scope: {
                    list: '='
                },
                controller: function ($scope) {
                    $scope.select = select
                    $scope.isSelected = function (it) {
                        return $scope.current === it
                    }

                    $scope.next = function () {
                        var list = $scope.list,
                            ix = list.indexOf($scope.current)

                        if (ix >= 0 && ix < (list.length - 1)) {
                            select(list[ix + 1])
                        }
                        else if (ix >= 0 && ix == (list.length - 1)) {
                            select(list[0])
                        }
                    }

                    $scope.$watch('list.length', function (val) {
                        if (val) {
                            select($scope.list[0])
                        }
                    })


                    function select(it) {
                        $scope.current = it
                    }
                }
            }
        })
        .directive('tagCloud', function () {
            return {
                restrict: 'E',
                templateUrl: 'views/partial/tagCloud.html',
                scope: {
                    tags: '='
                }
            }
        })

        .directive('itemDescription', function () {
            return {
                restrict: 'A',
                scope: {
                    itemDescription: '=',
                    size: '@',
                },
                template: '<span ng-bind-html="value"></span>',
                link: function (scope, element, attributes) {
                    scope.$watch('itemDescription.description', function (value) {
                        if (value) {
                            scope.value = _.truncate(value, {length: attributes.size || 100})
                        }
                        else {
                            scope.value = ''
                        }
                    })
                }
            }
        })
        .directive('itemPrice', function () {
            return {
                restrict: 'A',
                scope: {itemPrice: '=',},
                template: '<span class="price">{{item.price}}<sup>{{item.currency_code}}</sup></span>',
                link: function (scope, element, attributes) {
                    scope.$watch('itemPrice', function (value) {
                        scope.item = scope.itemPrice
                    })
                }
            }
        })
        .factory('ShopListService', function ($resource, API_BASE_URL, API_KEY) {
            return $resource(API_BASE_URL + "/:id.js", {
                    //keywords: $scope.keywords,
                    limit: 12,
                    includes: "Images:1",
                    api_key: API_KEY,
                    callback: "JSON_CALLBACK"
                },
                {
                    get: {
                        method: "JSONP",
                        isArray: false,
                        transformResponse: function (data) {
                            return data.results[0]
                        },
                        params: {
                            includes: "Images:5",
                        }
                    },
                    query: {
                        params: {id: 'active'},
                        method: "JSONP",
                        isArray: false
                    }
                }
            )
        })
        .controller('SearchController', function ($scope, $state) {
            $scope.term = $scope.lastSearch && $scope.lastSearch.term


            $scope.go = function () {
                $state.go('home.search', {term: $scope.term})
            }
        })
        .controller("ShopController", function ($scope, ShopListService, $stateParams, $state, $rootScope) {
            $scope.itemList = []

            $rootScope.lastSearch = {}

            $scope.select = function (it) {

                $rootScope.lastSearch = {
                    term: $stateParams.term
                }

                $state.go('home.productDetail', {id: it.listing_id})
            }

            ShopListService.query({
                    keywords: $stateParams.term ? $stateParams.term : null
                },
                function (rs) {
                    $scope.itemList = rs.results
                },
                function (error) {
                    alert("Something went wrong!")
                }
            )

        })

        .controller('ShopDetailController', function ($scope, $stateParams, ShopListService) {
            $scope.item = ShopListService
                .get($stateParams)
                .$promise
                .then(
                function (rs) {
                    $scope.item = rs
                },
                function (error) {
                    alert("Something went wrong!")
                }
            )
            //https://openapi.etsy.com/v2/listings/461236204.js?api_key=q7ea57pzppjoamtn54ippg8i&callback=angular.callbacks._0&includes=Images:1&limit=12
            console.log($stateParams)

        })

        .controller('PickQuantityController', function ($uibModalInstance, item) {
            var $ctrl = this

            $ctrl.quantity = 1
            $ctrl.item = item

            $ctrl.ok = function () {
                $uibModalInstance.close({
                    quantity: $ctrl.quantity,
                    item: $ctrl.item
                })
            }

            $ctrl.cancel = function () {
                $uibModalInstance.dismiss('cancel')
            }
        })
        .controller('CartController', function ($scope, localStorageService) {
            $scope.cart = localStorageService.get('shopCart') || []

            $scope.$on('item-added', function (ev, item) {
                console.log('item', item.quantity, item.item.title)
                $scope.cart.push(item)

                localStorageService.set('shopCart', $scope.cart)
            })

            $scope.getTotal = function () {
                return _.sum(
                    $scope.cart.map(function (it) {
                        return it.quantity * it.item.price
                    }))
            }

            $scope.clear = function () {
                localStorageService.clearAll()
                localStorageService.set('shopCart', $scope.cart = [])
            }
            $scope.checkout = function () {
                alert('not implemented')
            }
        })
        .controller('AddToCartController', function ($scope, $uibModal, $log, $rootScope) {
            var $ctrl = this

            $ctrl.add = function (item) {
                var modalInstance = $uibModal.open({
                    animation: true,
                    templateUrl: 'views/partial/pickQuantity.html',
                    controller: 'PickQuantityController',
                    controllerAs: '$ctrl',
                    resolve: {
                        item: function () {
                            return item
                        }
                    }
                })

                modalInstance.result.then(function (selectedItem) {
                    $rootScope.$broadcast("item-added", selectedItem)
                }, function () {
                    $log.info('Modal dismissed at: ' + new Date())
                })
            }
        })

}())