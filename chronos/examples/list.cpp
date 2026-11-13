#include <iostream>

struct Node {
    int data;
    Node* next;
};

Node* push(Node* head, int value) {
    Node* n = new Node{value, head};
    return n;
}

int sum(Node* head) {
    int total = 0;
    Node* cur = head;
    while (cur != nullptr) {
        total += cur->data;
        cur = cur->next;
    }
    return total;
}

int main() {
    Node* head = nullptr;
    for (int i = 1; i <= 4; i++) {
        head = push(head, i * 10);
    }
    int s = sum(head);
    std::cout << s << "\n";
    return 0;
}