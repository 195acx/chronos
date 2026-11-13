#include <iostream>

struct Person {
    int id;
    int age;
};

int getAge(Person* p) {
    // Bug: p is null when called with nullptr!
    return p->age;
}

int main() {
    Person* ptr = nullptr;
    std::cout << "Dereferencing pointer...\n";
    int val = getAge(ptr);
    std::cout << "Val: " << val << "\n";
    return 0;
}
