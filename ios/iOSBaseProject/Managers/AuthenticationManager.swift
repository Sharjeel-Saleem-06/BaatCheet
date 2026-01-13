//
//  AuthenticationManager.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 03/01/24.
//

import Foundation

@MainActor
class AuthenticationManager : ObservableObject {
    static let shared = AuthenticationManager(navigationManager: NavigationManager.shared)
    private var navigationManager = NavigationManager()
//    private init() {}
    
    private init(navigationManager: NavigationManager) {
           self.navigationManager = navigationManager
       }
    
    // MARK: - Attributes
    @Published var isAuthenticated = UserPreferences.shared.isAuthenticated
    
    
    // MARK: - Functions
    
    
    func login(/*user: LoginResponseModel,*/ email:String, password:String){
//        UserPreferences.shared.save(user, forKey: UserPreferences.Keys.userDataKey)
//        UserPreferences.shared.userID = user.userInfo?.id ?? -1
        KeyChainStorage.shared.setPassword(password)
        UserPreferences.shared.isAuthenticated = true
        isAuthenticated = true
        AnalyticsManager.logCustomEvent(eventType: EventType.login, properties: ["email": email])
        UserPreferences.shared.updateUserLoginStatus(status: UserStateEnum.LoggedIn)//Updating user status will navigate user to respective screen MainTabbar
    }
    
    func logout(){
        UserPreferences.shared.isAuthenticated = false
        UserPreferences.shared.userID = -1
        UserPreferences.shared.remove(forkey: UserPreferences.Keys.userDataKey)
        UserPreferences.shared.remove(forkey: UserPreferences.Keys.apiHeadersKey)
        UserPreferences.shared.updateUserLoginStatus(status: UserStateEnum.LoggedOut)
        isAuthenticated = false
    }
    
    func deleteAccount(){
        isAuthenticated = false
        UserPreferences.shared.userID = -1
        UserPreferences.shared.remove(forkey: UserPreferences.Keys.apiHeadersKey)
        UserPreferences.shared.updateUserLoginStatus(status: UserStateEnum.LoggedOut)
        UserPreferences.shared.deleteAllUserDefaults()
        KeyChainStorage.shared.deleteAllKey()
    }
}


enum UserStateEnum: String{
    case LoggedIn
    case LoggedOut
}

//enum UserRoleEnum : String{
//    case student = "leerling"
//    case trainer = "trainer"
//}
