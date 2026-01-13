//
//  Utility.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 10/01/24.
//

import Foundation
import UIKit

enum Gender: String, CaseIterable, Identifiable {
    case male = "Male"
    case female = "Female"
    case other = "Other"

    var id: String { self.rawValue }
}


enum DateFormate: String{
    case dd_MM_yyyy = "dd-MM-yyyy"
    case ddMMMMyyyy = "d MMMM yyyy"
    case EEE_d_MMM_yyyy = "EEEE d MMMM yyyy"
}

func saveUserDetails(name: String, email: String, dob: Date, gender: Gender, country: String, language: String){
//    let user = User(name: name, email: email, password: KeyChainStorage.shared.getPassword(), dob: formatDate(dob), gender: gender.rawValue, country: country, language: language)
//    UserPreferences.shared.saveUser(user: user)
}

func removeFocusFromTextField(){
    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to:nil, from:nil, for:nil)
}

func kelvinToCelsius(kelvinTemp: Double) -> Double {
    let celsius = kelvinTemp - 273.15
    return celsius.rounded(toPlaces: 2)
}

func formatDate(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = DateFormate.dd_MM_yyyy.rawValue
    return formatter.string(from: date)
}

func formatDOB(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = DateFormate.ddMMMMyyyy.rawValue
    if date == Date() {
        return ""
    }
    return formatter.string(from: date)
}

func formatDOB(_ dateString: String) -> String {
    guard let date = convertToDate(from: dateString) else {
        return ""
    }
    
    let formatter = DateFormatter()
    formatter.dateFormat = DateFormate.ddMMMMyyyy.rawValue
    return formatter.string(from: date)
}

func formattedDate() -> String {
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat =  DateFormate.EEE_d_MMM_yyyy.rawValue
    dateFormatter.locale = Locale(identifier:  UserPreferences.shared.selectedLanguageCode)
    let formattedDate = dateFormatter.string(from: Date())
    let capitalizedDate = formattedDate.prefix(1).uppercased() + formattedDate.dropFirst()
    
    return capitalizedDate
}

// Method to convert a string date to Date format
func convertToDate(from dateString: String, format: String = "YYYY-MM-dd") -> Date? {
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = format
    dateFormatter.timeZone = TimeZone.current
    dateFormatter.locale = Locale.current
    return dateFormatter.date(from: dateString)
}

// Method to remove time from Date
func removeTime(from date: Date) -> Date {
    let calendar = Calendar.current
    return calendar.startOfDay(for: date)
}


func openDeviceSettings() {
       guard let url = URL(string: UIApplication.openSettingsURLString) else {
           return
       }
       UIApplication.shared.open(url)
   }

extension Double {
    func g() -> String {
        return self.truncatingRemainder(dividingBy: 1) == 0 ? String(format: "%.0f", self) : String(self)
    }
    
    func rounded(toPlaces places: Int) -> Double {
        let multiplier = pow(10.0, Double(places))
        return (self * multiplier).rounded() / multiplier
    }
}

extension String {
    var nilIfEmpty: String? {
        self == "" ? nil : self
    }
    
    func formattedDate(format: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = format
        return formatter.date(from: self)
    }
}

extension String? {
    func isNotNullOrEmpty() -> Bool{
        return !(self == nil || self!.isEmpty)
    }
}

func getLocalString(_ key: String) -> String {
    return NSLocalizedString(key, comment: "")
}
