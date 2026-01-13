//
//  PickerView.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 25/04/24.
//

import SwiftUI

struct CountryView: View {
    @Binding var selectedCountry: String
    
    var  body: some View {
        VStack(alignment: .leading){
            HStack {
                Text(AppStrings.selectCountry.stringValue())
                    .font(.interRegular16)
                    .foregroundColor(.primaryNavyBlue)
                Picker(LocalizedStringKey(AppStrings.selectCountryPlaceHolder.stringValue()), selection: $selectedCountry){
                    ForEach(Constants.countriesOptions, id: \.self){
                        country in
                        Text(getLocalString(country))
                    }
                }
                .pickerStyle(DefaultPickerStyle())
                
                Spacer()
            }
        }
    }
}

struct GenderView: View {
    @Binding var selectedGender: Gender
    
    var body: some View  {
        VStack(alignment: .leading){
            Text(AppStrings.gender.stringValue())
                .font(.interRegular16)
                .foregroundColor(.primaryNavyBlue)
            Picker(AppStrings.genderPlaceHolder.stringValue(), selection: $selectedGender) {
                ForEach(Gender.allCases) { gender in
                    Text(getLocalString(gender.rawValue)).tag(gender)
                }
            }
            .pickerStyle(SegmentedPickerStyle())
        }
    }
}
