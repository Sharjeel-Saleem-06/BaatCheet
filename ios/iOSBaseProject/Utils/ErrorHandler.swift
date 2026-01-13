//
//  ErrorHandler.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 10/01/24.
//

import FirebaseCrashlytics


class ErrorHandler {
    
    static func logError(message: String, error: Error) {
        Crashlytics.crashlytics().log(message)
        
        let nsError = error as NSError
        Crashlytics.crashlytics().record(error: nsError)
    }
}
