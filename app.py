from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import json, re, random, os, base64
from datetime import datetime
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

# Load knowledge base
with open('knowledge.json', 'r', encoding='utf-8') as f:
    KB = json.load(f)

# Enhanced Student database
STUDENT_DATABASE = {
    "students": [
        {
            "id": "1BI20CS001",
            "name": "Rahul Sharma",
            "usn": "1BI20CS001",
            "department": "Computer Science & Engineering",
            "semester": "6th Semester",
            "email": "rahul.sharma@bietdvg.edu",
            "phone": "+91-9876543210",
            "address": "123 MG Road, Davangere, Karnataka - 577001",
            "dob": "15-05-2002",
            "blood_group": "B+",
            "photo_features": "male_light_complexion",
            "attendance": "92%",
            "grades": "A+",
            "current_cgpa": 9.0,
            "marks": {
                "semester_1": {"sgpa": 9.2, "backlogs": 0},
                "semester_2": {"sgpa": 9.0, "backlogs": 0},
                "semester_3": {"sgpa": 8.8, "backlogs": 0},
                "semester_4": {"sgpa": 9.1, "backlogs": 0},
                "semester_5": {"sgpa": 8.9, "backlogs": 0}
            },
            "fees": {
                "status": "Paid",
                "amount": "₹85,000",
                "due_date": "31-03-2024",
                "scholarship": "Merit Scholarship"
            },
            "additional_info": {
                "hostel": "Boys Hostel - Block A",
                "library_id": "LIB2020CS001",
                "nss_volunteer": True,
                "club_membership": ["Coding Club", "Robotics Club"]
            }
        },
        {
            "id": "1BI20EC002",
            "name": "Priya Patel",
            "usn": "1BI20EC002",
            "department": "Electronics & Communication Engineering",
            "semester": "6th Semester",
            "email": "priya.patel@bietdvg.edu",
            "phone": "+91-9876543211",
            "address": "456 Gandhi Nagar, Davangere, Karnataka - 577002",
            "dob": "20-12-2001",
            "blood_group": "O+",
            "photo_features": "female_medium_complexion",
            "attendance": "95%",
            "grades": "A+",
            "current_cgpa": 9.3,
            "marks": {
                "semester_1": {"sgpa": 9.5, "backlogs": 0},
                "semester_2": {"sgpa": 9.2, "backlogs": 0},
                "semester_3": {"sgpa": 9.4, "backlogs": 0},
                "semester_4": {"sgpa": 9.1, "backlogs": 0},
                "semester_5": {"sgpa": 9.3, "backlogs": 0}
            },
            "fees": {
                "status": "Paid",
                "amount": "₹82,000",
                "due_date": "31-03-2024",
                "scholarship": "Government Scholarship"
            },
            "additional_info": {
                "hostel": "Girls Hostel - Block B",
                "library_id": "LIB2020EC002",
                "nss_volunteer": True,
                "club_membership": ["Cultural Club", "NSS"]
            }
        },
        {
            "id": "1BI20ME003",
            "name": "Amit Kumar",
            "usn": "1BI20ME003",
            "department": "Mechanical Engineering",
            "semester": "6th Semester",
            "email": "amit.kumar@bietdvg.edu",
            "phone": "+91-9876543212",
            "address": "789 Nehru Road, Davangere, Karnataka - 577003",
            "dob": "10-08-2002",
            "blood_group": "A+",
            "photo_features": "male_dark_complexion",
            "attendance": "88%",
            "grades": "B+",
            "current_cgpa": 7.8,
            "marks": {
                "semester_1": {"sgpa": 8.0, "backlogs": 0},
                "semester_2": {"sgpa": 7.5, "backlogs": 1},
                "semester_3": {"sgpa": 7.8, "backlogs": 0},
                "semester_4": {"sgpa": 8.2, "backlogs": 0},
                "semester_5": {"sgpa": 7.5, "backlogs": 0}
            },
            "fees": {
                "status": "Pending",
                "amount": "₹78,000",
                "due_date": "31-03-2024",
                "scholarship": "None"
            },
            "additional_info": {
                "hostel": "Boys Hostel - Block C",
                "library_id": "LIB2020ME003",
                "nss_volunteer": False,
                "club_membership": ["Sports Club"]
            }
        }
    ]
}

class StudentRecognition:
    def __init__(self, student_database):
        self.student_db = student_database
    
    def recognize_student(self, image_data):
        """Simulate student recognition from photo"""
        try:
            available_students = self.student_db.get('students', [])
            if not available_students:
                return None
            
            # Simulate photo processing delay
            import time
            time.sleep(1)
            
            # Return random student for demo
            return random.choice(available_students)
            
        except Exception as e:
            print(f"Recognition error: {e}")
            return None
    
    def format_student_details(self, student, uploaded_photo_data=None):
        """Create compact student record card"""
        if not student:
            return "❌ No student record found."
        
        marks = student.get('marks', {})
        sgpas = [data.get("sgpa", 0) for data in marks.values()]
        cgpa = sum(sgpas) / len(sgpas) if sgpas else 0
        total_backlogs = sum([data.get("backlogs", 0) for data in marks.values()])
        
        return f"""
        <div class="student-record-card">
            <div class="student-header">
                <div class="student-basic-info">
                    <div class="student-avatar">
                        <i class="fas fa-user-graduate"></i>
                    </div>
                    <div class="student-details">
                        <h3>{student.get('name', 'N/A')}</h3>
                        <p class="usn">{student.get('usn', 'N/A')}</p>
                        <p class="department">{student.get('department', 'N/A')}</p>
                    </div>
                </div>
                <div class="student-stats">
                    <div class="stat-item">
                        <span class="stat-label">CGPA</span>
                        <span class="stat-value">{cgpa:.2f}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Attendance</span>
                        <span class="stat-value">{student.get('attendance', 'N/A')}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Backlogs</span>
                        <span class="stat-value">{total_backlogs}</span>
                    </div>
                </div>
            </div>

            <div class="student-contact-info">
                <div class="contact-item">
                    <i class="fas fa-envelope"></i>
                    <span>{student.get('email', 'N/A')}</span>
                </div>
                <div class="contact-item">
                    <i class="fas fa-phone"></i>
                    <span>{student.get('phone', 'N/A')}</span>
                </div>
                <div class="contact-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>{student.get('address', 'N/A')}</span>
                </div>
            </div>

            <div class="academic-performance">
                <h4>Academic Performance</h4>
                <div class="semester-marks">
                    {self.format_semester_marks(marks)}
                </div>
            </div>

            <div class="fee-info">
                <h4>Fee Information</h4>
                <div class="fee-details">
                    <div class="fee-item">
                        <span>Status:</span>
                        <span class="fee-status {student.get('fees', {}).get('status', '').lower()}">
                            {student.get('fees', {}).get('status', 'N/A')}
                        </span>
                    </div>
                    <div class="fee-item">
                        <span>Amount:</span>
                        <span>{student.get('fees', {}).get('amount', 'N/A')}</span>
                    </div>
                    <div class="fee-item">
                        <span>Due Date:</span>
                        <span>{student.get('fees', {}).get('due_date', 'N/A')}</span>
                    </div>
                    <div class="fee-item">
                        <span>Scholarship:</span>
                        <span>{student.get('fees', {}).get('scholarship', 'N/A')}</span>
                    </div>
                </div>
            </div>

            <div class="additional-info">
                <h4>Additional Information</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <i class="fas fa-home"></i>
                        <span>{student.get('additional_info', {}).get('hostel', 'N/A')}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-book"></i>
                        <span>Library ID: {student.get('additional_info', {}).get('library_id', 'N/A')}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-hands-helping"></i>
                        <span>NSS Volunteer: {'Yes' if student.get('additional_info', {}).get('nss_volunteer') else 'No'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-users"></i>
                        <span>Clubs: {', '.join(student.get('additional_info', {}).get('club_membership', []))}</span>
                    </div>
                </div>
            </div>
        </div>
        """
    
    def format_semester_marks(self, marks):
        if not marks:
            return '<p>No marks data available</p>'
        
        html = '<div class="semester-grid">'
        for sem, data in marks.items():
            sgpa = data.get("sgpa", 0)
            backlogs = data.get("backlogs", 0)
            status_class = "success" if backlogs == 0 else "warning"
            
            html += f'''
            <div class="semester-item {status_class}">
                <span class="semester-name">{sem.replace('_', ' ').title()}</span>
                <span class="semester-sgpa">SGPA: {sgpa}</span>
                <span class="semester-backlogs">Backlogs: {backlogs}</span>
            </div>
            '''
        html += '</div>'
        return html

# Initialize systems
student_recognition = StudentRecognition(STUDENT_DATABASE)

class ChatbotEngine:
    def __init__(self, knowledge_base):
        self.kb = knowledge_base
        self.setup_nlp()
    
    def setup_nlp(self):
        # Prepare questions and answers for TF-IDF
        self.questions = []
        self.answers = []
        
        # Add QA pairs from knowledge base
        for qa in self.kb.get('qa_pairs', []):
            self.questions.append(qa['question'])
            self.answers.append(qa['answer'])
        
        # Add category-based questions
        categories = ['admissions', 'courses', 'fee_structure', 'placements', 'facilities', 'departments']
        for category in categories:
            items = self.kb.get(category, [])
            for item in items:
                # Extract key terms to create synthetic questions
                key_terms = self.extract_key_terms(item)
                if key_terms:
                    synthetic_question = f"what is {key_terms}"
                    self.questions.append(synthetic_question)
                    self.answers.append(f"**{category.replace('_', ' ').title()}:**\n\n{item}")
        
        if self.questions:
            self.vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
            self.tfidf_matrix = self.vectorizer.fit_transform(self.questions)
        else:
            self.vectorizer = None
            self.tfidf_matrix = None
    
    def extract_key_terms(self, text):
        """Extract key terms from text to create synthetic questions"""
        # Remove emojis and special characters
        clean_text = re.sub(r'[^\w\s]', ' ', text)
        words = clean_text.split()
        
        # Filter out common words and get meaningful terms
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        key_terms = [word for word in words if word.lower() not in stop_words and len(word) > 3]
        
        return ' '.join(key_terms[:4]) if key_terms else None
    
    def preprocess_text(self, text):
        text = text.lower().strip()
        text = re.sub(r'[^\w\s]', '', text)
        return re.sub(r'\s+', ' ', text)
    
    def find_best_match(self, user_query):
        if not hasattr(self, 'vectorizer') or self.vectorizer is None:
            return None, 0.0
        
        processed_query = self.preprocess_text(user_query)
        query_vector = self.vectorizer.transform([processed_query])
        
        similarities = cosine_similarity(query_vector, self.tfidf_matrix)
        best_match_idx = np.argmax(similarities)
        best_score = similarities[0, best_match_idx]
        
        return self.answers[best_match_idx], best_score
    
    def generate_response(self, user_message, image_data=None):
        user_message_lower = user_message.lower()
        
        # Handle photo recognition first
        if image_data:
            student = student_recognition.recognize_student(image_data)
            if student:
                return student_recognition.format_student_details(student, image_data), 'student_record'
            return "❌ No student recognized. Try a clearer photo.", 'error'
        
        # Handle photo-related queries
        if any(word in user_message_lower for word in ['student', 'photo', 'picture', 'recognize', 'camera', 'upload']):
            return "📸 Upload a student photo using the camera button above to get student records!", 'photo_prompt'
        
        # Handle specific category queries with exact matching
        category_response = self.handle_category_queries(user_message_lower)
        if category_response:
            return category_response
        
        # Use TF-IDF for general question matching
        best_answer, score = self.find_best_match(user_message)
        
        if score > 0.3:
            return best_answer, 'qa'
        
        # Handle greetings
        if any(word in user_message_lower for word in ['hi', 'hello', 'hey', 'namaste', 'good morning', 'good afternoon']):
            return random.choice(self.kb.get('greetings', [])), 'greeting'
        
        # Handle thanks
        if any(word in user_message_lower for word in ['thank', 'thanks', 'thank you']):
            return "You're welcome! 😊 If you have more questions about BIET, feel free to ask!", 'general'
        
        # Handle help requests
        if any(word in user_message_lower for word in ['help', 'what can you do', 'options']):
            return self.get_help_response(), 'help'
        
        # Handle contact requests
        if any(word in user_message_lower for word in ['contact', 'phone', 'email', 'address', 'where are you', 'location']):
            return self.get_contact_response(), 'contact'
        
        # Fallback to general response
        return random.choice(self.kb.get('fallback_responses', [])), 'general'
    
    def handle_category_queries(self, user_message_lower):
        """Handle specific category queries with exact matching"""
        
        # Admissions queries
        if any(word in user_message_lower for word in ['admission', 'admit', 'apply', 'application', 'eligibility', 'cet', 'comedk']):
            return self.get_category_response('admissions'), 'admissions'
        
        # Fee queries
        if any(word in user_message_lower for word in ['fee', 'fees', 'cost', 'tuition', 'scholarship', 'payment']):
            return self.get_category_response('fee_structure'), 'fees'
        
        # Placement queries
        if any(word in user_message_lower for word in ['placement', 'placements', 'company', 'companies', 'recruiter', 'job', 'package', 'salary']):
            return self.get_category_response('placements'), 'placements'
        
        # Course queries
        if any(word in user_message_lower for word in ['course', 'courses', 'program', 'b.e', 'm.tech', 'mca', 'mba', 'engineering']):
            return self.get_category_response('courses'), 'courses'
        
        # Facility queries
        if any(word in user_message_lower for word in ['facility', 'facilities', 'hostel', 'library', 'lab', 'sports', 'cafeteria', 'medical']):
            return self.get_category_response('facilities'), 'facilities'
        
        # Department queries
        if any(word in user_message_lower for word in ['department', 'departments', 'cse', 'computer science', 'mechanical', 'civil', 'electronics', 'electrical', 'chemical', 'biotechnology']):
            return self.get_category_response('departments'), 'departments'
        
        return None
    
    def get_category_response(self, category):
        items = self.kb.get(category, [])
        if not items:
            return f"❌ No information available about {category.replace('_', ' ')}."
        
        response = f"**{category.replace('_', ' ').title()}:**\n\n"
        for item in items:
            response += f"• {item}\n"
        
        return response
    
    def get_help_response(self):
        return """**💡 BIET Assistant Help Guide**

**🎤 Voice Input:**
• Click the microphone icon for voice input
• Speak naturally about admissions, fees, placements
• Edit the transcribed text before sending

**📸 Photo Recognition:**
• Upload student photos for instant information
• Get academic records and contact details

**💬 Common Queries:**
• **Admission process** and eligibility criteria
• **Fee structure** and scholarship information
• **Placement statistics** and top recruiters
• **Course details** and department information
• **Hostel facilities** and campus amenities

**🏫 Quick Actions:**
• Use the quick question chips for common queries
• Upload photos for student recognition
• Use voice input for hands-free operation"""

    def get_contact_response(self):
        return """**📞 Contact Information**

**Bapuji Institute of Engineering & Technology**

• **📍 Address:** Shamanur Road, Davangere - 577004, Karnataka, India
• **📞 Phone:** +91-8192-222245, +91-8192-222246
• **📧 Email:** biet@bietdvg.edu, principal@bietdvg.edu
• **🌐 Website:** www.bietdvg.edu
• **🕒 Office Hours:** 9:30 AM - 5:30 PM (Monday to Friday)

**Admission Office:**
• 📞 Phone: +91-8192-222245
• 📧 Email: admissions@bietdvg.edu

**For specific department inquiries, please mention the department name.**"""

chatbot = ChatbotEngine(KB)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat_endpoint():
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        image_data = data.get('image', '')
        
        print(f"Received message: {user_message}")
        print(f"Image data present: {bool(image_data)}")
        
        response, response_type = chatbot.generate_response(user_message, image_data)
        
        print(f"Response type: {response_type}")
        
        return jsonify({
            'reply': response,
            'type': response_type,
            'timestamp': datetime.now().strftime('%H:%M')
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({
            'reply': 'Sorry, I encountered an error. Please try again.',
            'type': 'error'
        })

@app.route('/api/suggestions', methods=['GET'])
def get_suggestions():
    """Get suggested questions"""
    suggestions = [
        "What is the admission process for BE?",
        "Tell me about fee structure",
        "Which companies visit for placements?",
        "What facilities are available?",
        "How is Computer Science department?",
        "Is there scholarship available?"
    ]
    return jsonify({'suggestions': suggestions})

@app.route('/api/knowledge', methods=['GET'])
def get_knowledge_stats():
    """Get knowledge base statistics"""
    stats = {
        'qa_pairs': len(KB.get('qa_pairs', [])),
        'admissions': len(KB.get('admissions', [])),
        'courses': len(KB.get('courses', [])),
        'fee_structure': len(KB.get('fee_structure', [])),
        'placements': len(KB.get('placements', [])),
        'facilities': len(KB.get('facilities', [])),
        'departments': len(KB.get('departments', []))
    }
    return jsonify(stats)

if __name__ == '__main__':
    print("🚀 BIET Chatbot Server Starting...")
    print("📚 Knowledge base loaded successfully!")
    print(f"   - QA Pairs: {len(KB.get('qa_pairs', []))}")
    print(f"   - Admissions info: {len(KB.get('admissions', []))}")
    print(f"   - Courses: {len(KB.get('courses', []))}")
    print(f"   - Fee structure: {len(KB.get('fee_structure', []))}")
    print(f"   - Placements: {len(KB.get('placements', []))}")
    print("🎓 Student database initialized!")
    print("🌐 Server running on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)