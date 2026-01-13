//
//  NetworkManager.swift
//  SwiftAppTemplate
//
//  Created by Ashok Choudhary on 03/01/24.
//
import Alamofire
import Foundation

struct ErrorResponse: Codable {
    let detail: String
}

class NetworkManager {
    static let shared = NetworkManager()
    private let session: Session = .default
    var isNetworkAvailable:Bool {
        return NetworkReachabilityManager()!.isReachable
    }
    
    private init() { }
    
    enum HTTPMethod: String {
        case get = "GET"
        case post = "POST"
        case put = "PUT"
        case delete = "DELETE"
    }

    
    private func getParamsEncoded(params: Encodable?) -> Parameters? {
        guard let params = params else { return nil }
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try! encoder.encode(params)
        let encodedParams = try! JSONSerialization.jsonObject(with: data, options: []) as? Parameters
        return encodedParams
    }
    
    
    func publicApiRequest<T: Codable>(
        _ url: URL,
        method: HTTPMethod = .get,
        body:  [String: Any] = [:],
        headers: [String: Any] = [:]
    ) async throws -> BaseDataResponse<T> {
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        
        if !isNetworkAvailable{
            throw AppError.networkError
        }
        
        
        // Add custom headers if provided
        for (key, value) in headers {
            request.setValue(value as? String, forHTTPHeaderField: key)
        }
        print(request.allHTTPHeaderFields as Any)
        // Add body if provided
        let jsonData = try? JSONSerialization.data(withJSONObject: body, options: [])
        request.httpBody = jsonData
        
        // Perform the request
        let (data, response) = try await URLSession.shared.data(for: request)
        print("🌍 [REQUEST] URL: \(url)")
        print("📌 Headers: \(request.allHTTPHeaderFields ?? [:])")
        print(" Body: \(body)")
        
        // Validate and print response
        if let httpResponse = response as? HTTPURLResponse{
            switch httpResponse.statusCode{
            case 200...299:
                if UserPreferences.shared.isAuthenticated == false {
                    let headers = parseResponseHeader(httpResponse.allHeaderFields)
                    UserPreferences.shared.save(headers, forKey: UserPreferences.Keys.apiHeadersKey)
                }
                showRequestDetail(request: body, responseObject: data, response: httpResponse)

            case 401:
                print("\n\n\n ❌ ❌ ❌ ------- Failure Response Start ------- ❌ ❌ ❌ \n\n\n")
                print(try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any])
                print("\n\n\n ❌ ❌ ❌ ------- Failure Response End ------- ❌ ❌ ❌ \n")
            default:
                showRequestDetail(request: body, responseObject: data, response: httpResponse)
            }
        }
        
        //Parse response for API logs
        return try await parseResponse(response: data)
    }
    
    //Return Data Response
    func privateApiRequest<T: Codable>(
        _ url: URL,
        method: HTTPMethod = .get,
        pathVariables: [String: String] = [:], // For replacing {variables} in URLs
        body: [String: Any] = [:],
        headers: [String: Any] = [:]
    ) async throws -> BaseDataResponse<T> {
        
        // ✅ Replace path variables in URL
        var finalURLString = url.absoluteString
        for (key, value) in pathVariables {
            finalURLString = finalURLString.replacingOccurrences(of: "{\(key)}", with: value)
        }
        
        guard let finalURL = URL(string: finalURLString) else {
            throw AppError.apiError("Invalid URL after replacing path variables")
        }

        var request = URLRequest(url: finalURL)
        request.httpMethod = method.rawValue
        

        if !isNetworkAvailable{
            throw AppError.networkError
        }
        
        // Add custom headers if provided
        for (key, value) in headers {
            request.setValue(value as? String, forHTTPHeaderField: key)
        }
        
        // ✅ Ensure GET requests do not have a body
        if method != .get, !body.isEmpty {
            let jsonData = try? JSONSerialization.data(withJSONObject: body, options: [])
            request.httpBody = jsonData
        }

        print(" [REQUEST] URL: \(finalURL)")
        print(" Headers: \(request.allHTTPHeaderFields ?? [:])")
        print(" Body: \(body)")
        
        // ✅ Perform the request
        let (data, response) = try await URLSession.shared.data(for: request)
        
        // ✅ Validate response
        if let httpResponse = response as? HTTPURLResponse {
            switch httpResponse.statusCode {
            case 200...299:
                showRequestDetail(request: body, responseObject: data, response: httpResponse)
            case 401:
                await AuthenticationManager.shared.logout()
                print("\n\n\n ❌ ❌ ❌ ------- Failure Response Start ------- ❌ ❌ ❌ \n\n\n")
                print(try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any])
                print("\n\n\n ❌ ❌ ❌ ------- Failure Response End ------- ❌ ❌ ❌ \n")       
            default:
                showRequestDetail(request: body, responseObject: data, response: httpResponse)
            }
        }
        
        // ✅ Parse response for API logs
        return try await parseResponse(response: data)
    }

    //Return Data List
    func privateApiRequest<T: Codable>(
        _ url: URL,
        method: HTTPMethod = .get,
        pathVariables: [String: String] = [:], // For replacing {variables} in URLs
        body: [String: Any] = [:],
        headers: [String: Any] = [:]
    ) async throws -> BaseListResponse<T> {
        
        // ✅ Replace path variables in URL
        var finalURLString = url.absoluteString
        for (key, value) in pathVariables {
            finalURLString = finalURLString.replacingOccurrences(of: "{\(key)}", with: value)
        }
        
        guard let finalURL = URL(string: finalURLString) else {
            throw AppError.apiError("Invalid URL after replacing path variables")
        }

        var request = URLRequest(url: finalURL)
        request.httpMethod = method.rawValue
        

        if !isNetworkAvailable{
            throw AppError.networkError
        }
        
        // Add custom headers if provided
        for (key, value) in headers {
            request.setValue(value as? String, forHTTPHeaderField: key)
        }
        
        // ✅ Ensure GET requests do not have a body
        if method != .get, !body.isEmpty {
            let jsonData = try? JSONSerialization.data(withJSONObject: body, options: [])
            request.httpBody = jsonData
        }

        print("🌍 [REQUEST] URL: \(finalURL)")
        print("📌 Headers: \(request.allHTTPHeaderFields ?? [:])")
        
        // ✅ Perform the request
        let (data, response) = try await URLSession.shared.data(for: request)
        
        // ✅ Validate response
        if let httpResponse = response as? HTTPURLResponse {
            switch httpResponse.statusCode {
            case 200...299:
                showRequestDetail(request: body, responseObject: data, response: httpResponse)
            default:
                showRequestDetail(request: body, responseObject: data, response: httpResponse)
            }
        }
        
        // ✅ Parse response for API logs
        return try await parseResponse(response: data)
    }
    
    
    func publicApiRequestWithDirectModelClass<T: Codable>(
        _ url: URL,
        method: HTTPMethod = .get,
        body:  [String: Any] = [:],
        headers: [String: Any] = [:]
    ) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add custom headers if provided
        for (key, value) in headers {
            request.setValue(value as? String, forHTTPHeaderField: key)
        }
        
        // Add body if provided
        let jsonData = try? JSONSerialization.data(withJSONObject: body, options: [])
        request.httpBody = jsonData
        
        // Perform the request
        let (data, response) = try await URLSession.shared.data(for: request)
        
        // Validate response
        if let httpResponse = response as? HTTPURLResponse{
            switch httpResponse.statusCode{
            case 200...299:
                let headers = parseResponseHeader(httpResponse.allHeaderFields)
                UserPreferences.shared.save(headers, forKey: UserPreferences.Keys.apiHeadersKey)
                showRequestDetail(request: body, responseObject: data, response: httpResponse)
                
            case 401...403:
                await AuthenticationManager.shared.logout()
                print("\n\n\n ❌ ❌ ❌_____________________Authorization Failed_____________________ ❌ ❌ ❌ \n\n\n")
                print(try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any])
                print("\n\n\n ❌ ❌ ❌ ------- Response End ------- ❌ ❌ ❌ \n")
//                NotificationCenter.default.post(name: .userUnauthorized, object: nil)
            default:
                showRequestDetail(request: body, responseObject: data, response: httpResponse)
            }
        }
        
        //Parse response for API logs
        return try await parseResponse(response: data)
    }
    
    
    //MARK: HTTP Response Parsing
    func parseResponseHeader(_ headers: [AnyHashable: Any]) -> APIHeaders?{
        
        let stringHeaders = headers.reduce(into: [String: String]()) { dict, entry in
            if let value = entry.value as? String {
                dict["\(entry.key)"] = value
            } else if let value = entry.value as? Int {
                dict["\(entry.key)"] = "\(value)"
            } else if let value = entry.value as? Double {
                dict["\(entry.key)"] = "\(value)"
            }
        }
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: stringHeaders, options: [])
            let decodedHeaders = try JSONDecoder().decode(APIHeaders.self, from: jsonData)
            decodedHeaders.accept = "application/json"
            return decodedHeaders
        } catch {
            print("❌❌❌_____________________Failed to Parse Headers_____________________❌❌❌  \n\(error.localizedDescription)\n ❌❌❌__________________________________________❌❌❌")
            return nil
        }
    }
    
    //MARK: Parse Response
    func parseResponse<T: Codable>(response: Data)async throws -> T {
        
        // Decode the response
        do {
            let decodedResponse = try JSONDecoder().decode(T.self, from: response)
            
            return decodedResponse
        }
        catch DecodingError.keyNotFound(let key, let context){
            print("could not find key \(key) in JSON: \(context.debugDescription)")
            throw AppError.decodingError
        }catch DecodingError.valueNotFound(let type, let context) {
            print("could not find type \(type) in JSON: \(context.debugDescription)")
            throw AppError.decodingError
        }catch DecodingError.typeMismatch(let type, let context) {
            print("type mismatch for type \(type) in JSON: \(context.debugDescription)")
            throw AppError.decodingError
        } catch DecodingError.dataCorrupted(let context) {
            print("data found to be corrupted in JSON: \(context.debugDescription)")
            throw AppError.decodingError
        } catch  let error as NSError {
            print("Error in read(from:ofType:) domain= \(error.domain), description= \(error.localizedDescription)")
            throw AppError.decodingError
        }
    }
    
    //MARK: Parse Response To Print in Logs
    func showRequestDetail(request : [String: Any]?, responseObject data : Data, response: HTTPURLResponse) {
        print("\n\n\n ✅ ✅ ✅ ✅ ✅  ------- Success Response Start -------  ✅ ✅ ✅ ✅ ✅ \n")
        print(""+(response.url?.absoluteString ?? ""))
        print("\n=========   allHTTPHeaderFields   ========== \n")
        print("%@",response.allHeaderFields)
        
        if let bodyString = request{
            if let jsonData = try? JSONSerialization.data(withJSONObject: bodyString, options: .prettyPrinted)  {
                let bodyString = String(data: jsonData, encoding: .utf8)
                print("\n=========   Request httpBody   ========== \n" + bodyString!)
            } else {
                print("\n=========   Request httpBody   ========== \n" + "Found Request Body Nil")
            }
        }
        
        parseResponseToCheckSatus(data: data)
    }
    
    func parseResponseToCheckSatus(data:Data){
            do {
                if let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
                   let statusCode = json["status_code"] as? Int {
                    switch statusCode{
                    case 200...299:
                        prettyPrintRespone(data:data)
                        print("\n\n\n ✅ ✅ ✅ ✅ ✅  ------- Success Response End -------  ✅ ✅ ✅ ✅ ✅ \n")
                        
                    default:
                        prettyPrintRespone(data:data)
                        print("\n\n\n ✅ ✅ ✅ ✅ ✅  ------- Success Response End -------  ✅ ✅ ✅ ✅ ✅ \n")
//                        print("\n\n\n ❌ ❌ ❌ ------- Failure Response End ------- ❌ ❌ ❌ \n")
                    }
                }
            } catch {
                prettyPrintRespone(data:data)
                print("\n\n\n ❌ ❌ ❌ ------- Failure Response End ------- ❌ ❌ ❌ \n")
            }
    }
    
    func prettyPrintRespone(data:Data){
        if let responseString = String(data: data, encoding: String.Encoding.utf8){
            print("\n=========   Response Body   ========== \n" + responseString)
        } else {
            print("\n=========   Response Body   ========== \n" + "Found Response Body Nil")
        }
    }
    
    
}

